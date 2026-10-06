-- Magic v1. Ordinary clients have SELECT only; writes use checked transactional RPCs.
create table public.profiles(id uuid primary key references auth.users(id), name text not null check(length(name) between 1 and 120), active boolean not null default true, avatar_id uuid);
create table public.user_roles(user_id uuid references public.profiles(id), role text check(role in ('admin','coach','family')), primary key(user_id,role));
create table public.teams(id uuid primary key default gen_random_uuid(), name text not null unique, age_label text not null default '', color text not null default '#e6127d', active boolean not null default true);
create table public.coach_assignments(coach_id uuid references public.profiles(id),team_id uuid references public.teams(id),primary key(coach_id,team_id));
create table public.athletes(id uuid primary key default gen_random_uuid(),name text not null,display_name text not null,active boolean not null default true,tv_consent boolean not null default false,photo_id uuid);
create table public.team_memberships(athlete_id uuid references public.athletes(id),team_id uuid references public.teams(id),primary key(athlete_id,team_id));
create table public.guardian_athletes(user_id uuid references public.profiles(id),athlete_id uuid references public.athletes(id),primary key(user_id,athlete_id));
create table public.skills(id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id),name text not null,area text not null,criteria jsonb not null check(jsonb_typeof(criteria)='array' and jsonb_array_length(criteria) between 1 and 20),active boolean not null default true);
create table public.evaluations(id uuid primary key default gen_random_uuid(),athlete_id uuid not null references public.athletes(id),team_id uuid not null references public.teams(id),skill_id uuid not null references public.skills(id),author_id uuid not null references public.profiles(id),scores jsonb not null,mastered boolean not null default false,comment text not null default '',next_goal text not null default '',revision_of uuid unique references public.evaluations(id),created_at timestamptz not null default clock_timestamp());
create table public.evaluation_drafts(id uuid primary key default gen_random_uuid(),author_id uuid not null references public.profiles(id),athlete_id uuid not null references public.athletes(id),skill_id uuid not null references public.skills(id),team_id uuid not null references public.teams(id),payload jsonb not null,updated_at timestamptz not null default now(),unique(author_id,athlete_id,skill_id));
create table public.consent_records(id uuid primary key default gen_random_uuid(),athlete_id uuid not null references public.athletes(id),actor_id uuid not null references public.profiles(id),allowed boolean not null,evidence text not null,created_at timestamptz not null default now());
create table public.media(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),athlete_id uuid references public.athletes(id),team_ids uuid[] not null default '{}',subject_ids uuid[] not null default '{}',kind text not null check(kind in ('family','official','avatar','athlete')),title text not null,status text not null default 'uploading' check(status in ('uploading','pending','approved','rejected','withdrawn')),portal boolean not null default false,tv boolean not null default false,consent_verified boolean not null default false,object_path text,expires_at timestamptz,reason text,consent_evidence text,reviewer_id uuid references public.profiles(id),created_at timestamptz not null default now(),reviewed_at timestamptz);
alter table public.profiles add foreign key(avatar_id) references public.media(id);
alter table public.athletes add foreign key(photo_id) references public.media(id);
create table public.invitations(id uuid primary key default gen_random_uuid(),email text not null unique,name text not null,role text not null check(role in ('family','coach')),claimed_at timestamptz,created_at timestamptz not null default now());
create table public.tv_devices(id uuid primary key default gen_random_uuid(),name text not null,team_ids uuid[] not null,active boolean not null default true,activation_hash text unique,activation_expires timestamptz,session_hash text unique,session_expires timestamptz,last_seen_at timestamptz,athlete_seconds int not null default 10 check(athlete_seconds between 5 and 30),photo_seconds int not null default 8 check(photo_seconds between 5 and 30),photos_enabled boolean not null default true,created_at timestamptz not null default now());
create table public.audit_events(id bigint generated always as identity primary key,actor_id uuid,action text not null,entity_id text,created_at timestamptz not null default now());
create table public.media_reviews(id uuid primary key default gen_random_uuid(),media_id uuid not null references public.media(id),reviewer_id uuid not null references public.profiles(id),decision text not null,team_ids uuid[] not null,subject_ids uuid[] not null,evidence text not null,created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,hits int not null,expires_at timestamptz not null);
create index on public.evaluations(athlete_id,team_id,created_at desc);
create index on public.media(owner_id,status);
create index on public.media using gin(team_ids);
create index on public.guardian_athletes(athlete_id);
create index on public.team_memberships(team_id);

create function public.has_role(r text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles ur join public.profiles p on p.id=ur.user_id where ur.user_id=auth.uid() and ur.role=r and p.active)
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.has_role('admin') and coalesce(auth.jwt()->>'aal','aal1')='aal2'
$$;
create function public.is_coach(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or (public.has_role('coach') and exists(select 1 from public.coach_assignments c where c.coach_id=auth.uid() and c.team_id=t))
$$;
create function public.is_guardian(a uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.has_role('family') and exists(select 1 from public.guardian_athletes g where g.user_id=auth.uid() and g.athlete_id=a)
$$;
create function public.can_team(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_coach(t) or exists(select 1 from public.team_memberships m join public.athletes a on a.id=m.athlete_id where m.team_id=t and a.active and public.is_guardian(a.id))
$$;
create function public.can_athlete(a uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or public.is_guardian(a) or exists(select 1 from public.team_memberships m where m.athlete_id=a and public.is_coach(m.team_id))
$$;
create function public.can_moderate(ts uuid[]) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or (cardinality(ts)>0 and not exists(select 1 from unnest(ts) t where not public.is_coach(t)))
$$;
create function public.can_media(m public.media) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active) and (public.is_admin() or m.owner_id=auth.uid() or
 (m.kind in ('family','official') and public.can_moderate(m.team_ids)) or
 (m.status='approved' and (m.expires_at is null or m.expires_at>now()) and
   ((m.kind='athlete' and public.can_athlete(m.athlete_id)) or
    (m.portal and exists(select 1 from unnest(m.team_ids) t where public.can_team(t))))))
$$;

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin() or exists(select 1 from public.coach_assignments c where c.coach_id=id and public.can_team(c.team_id)));
alter table public.user_roles enable row level security;
create policy roles_read on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_admin());
alter table public.teams enable row level security;
create policy teams_read on public.teams for select to authenticated using(public.can_team(id));
alter table public.coach_assignments enable row level security;
create policy assignments_read on public.coach_assignments for select to authenticated using(public.can_team(team_id));
alter table public.athletes enable row level security;
create policy athletes_read on public.athletes for select to authenticated using(public.can_athlete(id));
alter table public.team_memberships enable row level security;
create policy memberships_read on public.team_memberships for select to authenticated using(public.is_admin() or public.is_coach(team_id) or public.is_guardian(athlete_id));
alter table public.guardian_athletes enable row level security;
create policy guardians_read on public.guardian_athletes for select to authenticated using(user_id=auth.uid() or public.is_admin());
alter table public.skills enable row level security;
create policy skills_read on public.skills for select to authenticated using(public.can_team(team_id));
alter table public.evaluations enable row level security;
create policy evaluations_read on public.evaluations for select to authenticated using(public.is_coach(team_id) or public.is_guardian(athlete_id));
alter table public.evaluation_drafts enable row level security;
create policy drafts_read on public.evaluation_drafts for select to authenticated using(author_id=auth.uid() and public.is_coach(team_id));
alter table public.consent_records enable row level security;
create policy consents_read on public.consent_records for select to authenticated using(public.is_admin());
alter table public.media_reviews enable row level security;
create policy reviews_read on public.media_reviews for select to authenticated using(public.is_admin());
alter table public.media enable row level security;
create policy media_read on public.media for select to authenticated using(public.can_media(media));
alter table public.invitations enable row level security;
create policy invitations_read on public.invitations for select to authenticated using(public.is_admin());
alter table public.tv_devices enable row level security;
-- Never grant authenticated SELECT on device hashes. The API supplies a safe projection after admin verification.
alter table public.audit_events enable row level security;
create policy audit_read on public.audit_events for select to authenticated using(public.is_admin());
alter table public.rate_limits enable row level security;

create function public.activate_profile() returns void language plpgsql security definer set search_path='' as $$
declare u auth.users; inv public.invitations;
begin
 select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if u.id is null then raise exception 'Acceso no verificado'; end if;
 select * into inv from public.invitations where lower(email)=lower(u.email) and claimed_at is null for update;
 if inv.id is not null then
   insert into public.profiles(id,name) values(u.id,inv.name) on conflict(id) do nothing;
   insert into public.user_roles(user_id,role) values(u.id,inv.role) on conflict do nothing;
   update public.invitations set claimed_at=now() where id=inv.id;
 end if;
end $$;

create function public.magic_command(action text,d jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); eid uuid; aid uuid; tid uuid; sid uuid; ts uuid[]; subjects uuid[]; sk public.skills; m public.media; vals jsonb; previous uuid; result jsonb:='{}';
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and active) then raise exception 'Acceso no autorizado'; end if;
 if length(d::text)>30000 then raise exception 'Solicitud demasiado grande'; end if;
 if public.has_role('admin') and not public.is_admin() then raise exception 'Verifica el segundo factor'; end if;
 if action in ('team_save','invite','coach_assign','coach_remove','coach_restore','athlete_save','membership','guardian_link','skill_create','skill_archive','consent') and not public.is_admin() then raise exception 'Solo administración'; end if;
 case action
 when 'team_save' then
   if length(trim(d->>'name')) not between 2 and 80 then raise exception 'Nombre inválido'; end if;
   eid:=coalesce(nullif(d->>'id','')::uuid,gen_random_uuid());
   insert into public.teams(id,name,age_label) values(eid,trim(d->>'name'),left(coalesce(d->>'age_label',''),80)) on conflict(id) do update set name=excluded.name,age_label=excluded.age_label;
 when 'invite' then
   if d->>'role' not in ('coach','family') or d->>'email' !~ '^[^ @]+@[^ @]+\.[^ @]+$' or length(trim(d->>'name')) not between 2 and 120 then raise exception 'Invitación inválida'; end if;
   insert into public.invitations(email,name,role) values(lower(trim(d->>'email')),trim(d->>'name'),d->>'role') on conflict(email) do update set name=excluded.name,role=excluded.role where invitations.claimed_at is null returning id into eid;
   if eid is null then raise exception 'La cuenta ya está vinculada'; end if;
 when 'coach_assign' then
   aid:=(d->>'coach_id')::uuid; tid:=(d->>'team_id')::uuid;
   if not exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=aid and r.role='coach' and p.active) then raise exception 'Coach no activo'; end if;
   if coalesce((d->>'remove')::boolean,false) then delete from public.coach_assignments where coach_id=aid and team_id=tid;
   else insert into public.coach_assignments values(aid,tid) on conflict do nothing; end if;
   eid:=aid;
 when 'coach_remove' then
   eid:=(d->>'id')::uuid;
   delete from public.coach_assignments where coach_id=eid;
   delete from public.user_roles where user_id=eid and role='coach';
 when 'coach_restore' then
   eid:=(d->>'id')::uuid;
   if not exists(select 1 from public.profiles where id=eid and active) then raise exception 'Cuenta no activa'; end if;
   insert into public.user_roles values(eid,'coach') on conflict do nothing;
 when 'athlete_save' then
   if length(trim(d->>'name')) not between 2 and 120 or length(trim(d->>'display_name')) not between 1 and 60 then raise exception 'Nombre inválido'; end if;
   eid:=coalesce(nullif(d->>'id','')::uuid,gen_random_uuid());
   insert into public.athletes(id,name,display_name,active) values(eid,trim(d->>'name'),trim(d->>'display_name'),coalesce((d->>'active')::boolean,true)) on conflict(id) do update set name=excluded.name,display_name=excluded.display_name,active=excluded.active;
 when 'membership' then
   aid:=(d->>'athlete_id')::uuid; tid:=(d->>'team_id')::uuid; eid:=aid;
   if coalesce((d->>'remove')::boolean,false) then delete from public.team_memberships where athlete_id=aid and team_id=tid;
   else insert into public.team_memberships values(aid,tid) on conflict do nothing; end if;
 when 'guardian_link' then
   aid:=(d->>'athlete_id')::uuid; sid:=(d->>'user_id')::uuid; eid:=aid;
   if not exists(select 1 from public.user_roles where user_id=sid and role='family') then raise exception 'Cuenta familiar no válida'; end if;
   if coalesce((d->>'remove')::boolean,false) then delete from public.guardian_athletes where athlete_id=aid and user_id=sid;
   else insert into public.guardian_athletes values(sid,aid) on conflict do nothing; end if;
 when 'consent' then
   eid:=(d->>'athlete_id')::uuid;
   if length(trim(coalesce(d->>'evidence',''))) not between 5 and 500 then raise exception 'Registra la referencia de la autorización o retirada'; end if;
   update public.athletes set tv_consent=coalesce((d->>'allowed')::boolean,false) where id=eid;
   insert into public.consent_records(athlete_id,actor_id,allowed,evidence) values(eid,uid,coalesce((d->>'allowed')::boolean,false),trim(d->>'evidence'));
   if not coalesce((d->>'allowed')::boolean,false) then update public.media set tv=false where eid=any(subject_ids) or athlete_id=eid; end if;
 when 'skill_create' then
   if length(trim(d->>'name')) not between 2 and 100 or jsonb_typeof(d->'criteria')<>'array' then raise exception 'Habilidad inválida'; end if;
   if exists(select 1 from jsonb_array_elements(d->'criteria') c where jsonb_typeof(c)<>'string' or length(c#>>'{}') not between 2 and 150) then raise exception 'Criterios inválidos'; end if;
   insert into public.skills(team_id,name,area,criteria) values((d->>'team_id')::uuid,trim(d->>'name'),left(d->>'area',60),d->'criteria') returning id into eid;
 when 'skill_archive' then update public.skills set active=false where id=(d->>'id')::uuid returning id into eid;
 when 'evaluate','draft_save' then
   aid:=(d->>'athlete_id')::uuid; sid:=(d->>'skill_id')::uuid;
   select * into sk from public.skills where id=sid and active for share;
   tid:=sk.team_id;
   if tid is null or not public.is_coach(tid) or not exists(select 1 from public.team_memberships tm join public.athletes a on a.id=tm.athlete_id where a.id=aid and a.active and tm.team_id=tid) then raise exception 'Evaluación no permitida'; end if;
   vals:=d->'scores';
   if jsonb_typeof(vals)<>'array' or jsonb_array_length(vals)<>jsonb_array_length(sk.criteria) or exists(select 1 from jsonb_array_elements(vals) v where jsonb_typeof(v)<>'boolean') then raise exception 'Resultados inválidos'; end if;
   if coalesce((d->>'mastered')::boolean,false) and exists(select 1 from jsonb_array_elements(vals) v where v='false'::jsonb) then raise exception 'Completa todos los criterios antes de validar'; end if;
   if action='draft_save' then
     insert into public.evaluation_drafts(author_id,athlete_id,skill_id,team_id,payload) values(uid,aid,sid,tid,d)
     on conflict(author_id,athlete_id,skill_id) do update set payload=excluded.payload,updated_at=now() returning id into eid;
     return jsonb_build_object('id',eid);
   end if;
   perform 1 from public.athletes where id=aid for update;
   eid:=(d->>'id')::uuid;
   if exists(select 1 from public.evaluations where id=eid) then
     if exists(select 1 from public.evaluations where id=eid and author_id=uid and athlete_id=aid and skill_id=sid and scores=vals) then return jsonb_build_object('id',eid); end if;
     raise exception 'Identificador ya utilizado';
   end if;
   select id into previous from public.evaluations where athlete_id=aid and skill_id=sid order by created_at desc,id desc limit 1;
   if previous is distinct from nullif(d->>'revision_of','')::uuid then raise exception 'Otro coach actualizó esta habilidad. Recarga antes de publicar.'; end if;
   if nullif(d->>'revision_of','') is not null and not exists(select 1 from public.evaluations where id=(d->>'revision_of')::uuid and athlete_id=aid and skill_id=sid) then raise exception 'Revisión inválida'; end if;
   eid:=(d->>'id')::uuid;
   insert into public.evaluations(id,athlete_id,team_id,skill_id,author_id,scores,mastered,comment,next_goal,revision_of)
   values(eid,aid,tid,sid,uid,vals,coalesce((d->>'mastered')::boolean,false),left(coalesce(d->>'comment',''),1000),left(coalesce(d->>'next_goal',''),200),nullif(d->>'revision_of','')::uuid) on conflict(id) do nothing;
   delete from public.evaluation_drafts where author_id=uid and athlete_id=aid and skill_id=sid;
 when 'media_create' then
   select coalesce(array_agg(value::uuid),'{}'::uuid[]) into ts from jsonb_array_elements_text(coalesce(d->'team_ids','[]'));
   if exists(select 1 from public.media where owner_id=uid and created_at>now()-interval '1 hour' group by owner_id having count(*)>=40) then raise exception 'Límite de cargas alcanzado; intenta más tarde'; end if;
   if d->>'kind'='official' and not public.is_admin() then raise exception 'Solo administración publica fotos oficiales'; end if;
   if d->>'kind' in ('family','official') and (cardinality(ts)=0 or exists(select 1 from unnest(ts) t where not public.can_team(t))) then raise exception 'Equipo no autorizado'; end if;
   aid:=nullif(d->>'athlete_id','')::uuid;
   if d->>'kind'='athlete' and not (public.is_admin() or public.is_guardian(aid)) then raise exception 'Foto no autorizada'; end if;
   insert into public.media(owner_id,athlete_id,team_ids,kind,title) values(uid,aid,ts,d->>'kind',left(coalesce(d->>'title','Foto Magic'),160)) returning id into eid;
 when 'media_review' then
   select * into m from public.media where id=(d->>'id')::uuid for update;
   if m.id is null or m.kind not in ('family','official','athlete') or (m.kind='athlete' and not public.is_admin()) or (m.kind<>'athlete' and not public.can_moderate(m.team_ids)) then raise exception 'Revisión no permitida'; end if;
   if m.status not in ('pending','approved','rejected') then raise exception 'La foto no está lista'; end if;
   if (d->>'approve')::boolean and not coalesce((d->>'consent_verified')::boolean,false) then raise exception 'Verifica la autorización de todas las personas'; end if;
   if (d->>'approve')::boolean and length(trim(coalesce(d->>'evidence',''))) not between 5 and 500 then raise exception 'Registra la referencia de las autorizaciones revisadas'; end if;
   select coalesce(array_agg(value::uuid),'{}'::uuid[]) into subjects from jsonb_array_elements_text(coalesce(d->'subject_ids','[]'));
   if m.kind='athlete' then subjects:=array[m.athlete_id]; end if;
   if exists(select 1 from unnest(subjects) s where not public.can_athlete(s)) then raise exception 'Persona fuera de tu alcance'; end if;
   if (d->>'approve')::boolean and coalesce((d->>'tv')::boolean,true) and exists(select 1 from unnest(subjects) s where not exists(select 1 from public.athletes where id=s and active and tv_consent)) then raise exception 'Una deportista no tiene autorización vigente para TV'; end if;
   eid:=m.id;
   update public.media set status=case when (d->>'approve')::boolean then 'approved' else 'rejected' end,
    tv=(d->>'approve')::boolean and coalesce((d->>'tv')::boolean,true),portal=(d->>'approve')::boolean and coalesce((d->>'portal')::boolean,false),
    consent_verified=coalesce((d->>'consent_verified')::boolean,false),subject_ids=subjects,consent_evidence=left(coalesce(d->>'evidence',''),500),reviewer_id=uid,reviewed_at=now(),reason=left(coalesce(d->>'reason',''),300),expires_at=nullif(d->>'expires_at','')::timestamptz where id=eid;
   insert into public.media_reviews(media_id,reviewer_id,decision,team_ids,subject_ids,evidence) values(eid,uid,case when (d->>'approve')::boolean then 'approved' else 'rejected' end,m.team_ids,subjects,left(coalesce(d->>'evidence',''),500));
 when 'media_withdraw' then
   select * into m from public.media where id=(d->>'id')::uuid for update;
   if m.id is null or not (m.owner_id=uid or public.is_admin() or (m.kind='athlete' and public.is_guardian(m.athlete_id)) or (m.kind in ('family','official') and public.can_moderate(m.team_ids))) then raise exception 'Acceso no autorizado'; end if;
   eid:=m.id; update public.media set status='withdrawn',tv=false,portal=false where id=eid;
   update public.profiles set avatar_id=null where avatar_id=eid;
   update public.athletes set photo_id=null where photo_id=eid;
 else raise exception 'Operación desconocida';
 end case;
 insert into public.audit_events(actor_id,action,entity_id) values(uid,action,coalesce(eid::text,''));
 return jsonb_build_object('id',eid);
end $$;

revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.user_roles,public.teams,public.coach_assignments,public.athletes,public.team_memberships,public.guardian_athletes,public.skills,public.evaluations,public.evaluation_drafts,public.consent_records,public.media_reviews,public.media,public.invitations,public.audit_events to authenticated;
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.has_role(text),public.is_admin(),public.is_coach(uuid),public.is_guardian(uuid),public.can_team(uuid),public.can_athlete(uuid),public.can_moderate(uuid[]),public.can_media(public.media),public.activate_profile(),public.magic_command(text,jsonb) to authenticated;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

insert into public.teams(name,age_label,color) values
 ('Magic Beautiful','4–7 años','#e6127d'),('Magic Power','','#a78bfa'),('Magic Energy','','#f59e0b'),('Magic Infinity','','#38bdf8'),('Magic Love','','#fb7185'),('Magic Joy','','#34d399'),('Magic Stronger','','#818cf8');
