-- Coach-owned professional profiles, with administration review.
create table public.coach_profiles(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 headline text not null default '' check(length(headline)<=120),
 bio text not null default '' check(length(bio)<=1200),
 phone text not null default '' check(length(phone)<=40),
 specialty text not null default '' check(length(specialty)<=160),
 admin_approved boolean not null default false,
 admin_note text not null default '' check(length(admin_note)<=500),
 updated_at timestamptz not null default now()
);
alter table public.coach_profiles enable row level security;
create policy coach_profiles_read on public.coach_profiles for select to authenticated using(user_id=auth.uid() or public.is_admin());

create function public.magic_coach_command(action text,d jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); target uuid:=coalesce(nullif(d->>'user_id','')::uuid,auth.uid()); eid uuid;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and active) then raise exception 'Acceso no autorizado'; end if;
 if length(d::text)>30000 then raise exception 'Solicitud demasiado grande'; end if;
 if public.has_role('admin') and not public.is_admin() then raise exception 'Verifica el segundo factor'; end if;
 if not exists(select 1 from public.user_roles where user_id=target and role='coach') then raise exception 'Perfil de entrenador no válido'; end if;
 if action='coach_profile_save' then
   if target<>uid and not public.is_admin() then raise exception 'Solo puedes editar tu propio perfil'; end if;
   insert into public.coach_profiles(user_id,headline,bio,phone,specialty,admin_approved,admin_note)
   values(target,left(trim(coalesce(d->>'headline','')),120),left(trim(coalesce(d->>'bio','')),1200),left(trim(coalesce(d->>'phone','')),40),left(trim(coalesce(d->>'specialty','')),160),false,'')
   on conflict(user_id) do update set headline=excluded.headline,bio=excluded.bio,phone=excluded.phone,specialty=excluded.specialty,admin_approved=case when public.is_admin() then coach_profiles.admin_approved else false end,updated_at=now()
   returning user_id into eid;
 elsif action='coach_profile_review' then
   if not public.is_admin() then raise exception 'Solo administración'; end if;
   insert into public.coach_profiles(user_id,admin_approved,admin_note) values(target,coalesce((d->>'approved')::boolean,false),left(trim(coalesce(d->>'admin_note','')),500))
   on conflict(user_id) do update set admin_approved=excluded.admin_approved,admin_note=excluded.admin_note,updated_at=now()
   returning user_id into eid;
 else raise exception 'Operación desconocida'; end if;
 insert into public.audit_events(actor_id,action,entity_id) values(uid,action,eid::text);
 return jsonb_build_object('id',eid);
end $$;

revoke all on public.coach_profiles from anon,authenticated;
grant select on public.coach_profiles to authenticated;
grant execute on function public.magic_coach_command(text,jsonb) to authenticated;
grant all on public.coach_profiles to service_role;
