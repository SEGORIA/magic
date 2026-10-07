-- Tasks and monthly learning goals. Images remain private task evidence, never gallery or TV media.
create table public.tasks(
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id),
 title text not null check(length(title) between 2 and 140),
 instructions text not null default '' check(length(instructions)<=2000),
 due_at timestamptz,
 active boolean not null default true,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create index on public.tasks(team_id,active,due_at);
create table public.monthly_skill_goals(
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id),
 skill_id uuid not null references public.skills(id),
 month date not null check(month=date_trunc('month',month)::date),
 note text not null default '' check(length(note)<=500),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 unique(team_id,skill_id,month)
);
create index on public.monthly_skill_goals(team_id,month);
alter table public.media add column task_id uuid references public.tasks(id);
alter table public.media drop constraint media_kind_check;
alter table public.media add constraint media_kind_check check(kind in ('family','official','avatar','athlete','task'));
create index on public.media(task_id,athlete_id,status);

create function public.can_task(t public.tasks) returns boolean language sql stable security definer set search_path='' as $$
 select public.can_team(t.team_id)
$$;
alter table public.tasks enable row level security;
create policy tasks_read on public.tasks for select to authenticated using(public.can_task(tasks));
alter table public.monthly_skill_goals enable row level security;
create policy monthly_goals_read on public.monthly_skill_goals for select to authenticated using(public.can_team(team_id));

create or replace function public.can_media(m public.media) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active) and (public.is_admin() or m.owner_id=auth.uid() or
 (m.kind in ('family','official','task') and public.can_moderate(m.team_ids)) or
 (m.kind='task' and public.is_guardian(m.athlete_id)) or
 (m.status='approved' and (m.expires_at is null or m.expires_at>now()) and
   ((m.kind='athlete' and public.can_athlete(m.athlete_id)) or
    (m.portal and exists(select 1 from unnest(m.team_ids) t where public.can_team(t))))))
$$;

create function public.magic_task_command(action text,d jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); eid uuid; aid uuid; tid uuid; sid uuid; task public.tasks; m public.media;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and active) then raise exception 'Acceso no autorizado'; end if;
 if length(d::text)>30000 then raise exception 'Solicitud demasiado grande'; end if;
 if public.has_role('admin') and not public.is_admin() then raise exception 'Verifica el segundo factor'; end if;
 if action in ('task_create','task_close','monthly_goal_save') and not (public.is_admin() or public.has_role('coach')) then raise exception 'Solo coaches o administración'; end if;
 case action
 when 'task_create' then
   tid:=(d->>'team_id')::uuid;
   if not public.is_coach(tid) or length(trim(d->>'title')) not between 2 and 140 or length(coalesce(d->>'instructions',''))>2000 then raise exception 'Tarea no válida o equipo no autorizado'; end if;
   insert into public.tasks(team_id,title,instructions,due_at,created_by) values(tid,trim(d->>'title'),left(coalesce(d->>'instructions',''),2000),nullif(d->>'due_at','')::timestamptz,uid) returning id into eid;
 when 'task_close' then
   update public.tasks set active=false where id=(d->>'id')::uuid and public.is_coach(team_id) returning id into eid;
   if eid is null then raise exception 'No puedes cerrar esta tarea'; end if;
 when 'monthly_goal_save' then
   tid:=(d->>'team_id')::uuid; sid:=(d->>'skill_id')::uuid;
   if not public.is_coach(tid) or not exists(select 1 from public.skills where id=sid and team_id=tid and active) then raise exception 'Habilidad o equipo no autorizado'; end if;
   insert into public.monthly_skill_goals(team_id,skill_id,month,note,created_by) values(tid,sid,date_trunc('month',(d->>'month')::date)::date,left(coalesce(d->>'note',''),500),uid) on conflict(team_id,skill_id,month) do update set note=excluded.note,created_by=excluded.created_by,created_at=now() returning id into eid;
 when 'task_review' then
   select * into m from public.media where id=(d->>'id')::uuid and kind='task' for update;
   if m.id is null or not public.can_moderate(m.team_ids) then raise exception 'No puedes revisar esta evidencia'; end if;
   update public.media set status=case when coalesce((d->>'approve')::boolean,true) then 'approved' else 'rejected' end, reviewer_id=uid,reviewed_at=now(),reason=left(coalesce(d->>'reason',''),300),tv=false,portal=false where id=m.id returning id into eid;
 when 'task_media_create' then
   if exists(select 1 from public.media where owner_id=uid and created_at>now()-interval '1 hour' group by owner_id having count(*)>=40) then raise exception 'Límite de cargas alcanzado; intenta más tarde'; end if;
   aid:=(d->>'athlete_id')::uuid; eid:=(d->>'task_id')::uuid;
   select * into task from public.tasks where id=eid and active;
   if task.id is null or not exists(select 1 from public.team_memberships where athlete_id=aid and team_id=task.team_id) or not (public.is_coach(task.team_id) or public.is_guardian(aid)) then raise exception 'No puedes entregar esta tarea'; end if;
   insert into public.media(owner_id,athlete_id,task_id,team_ids,kind,title) values(uid,aid,eid,array[task.team_id],'task',left(coalesce(d->>'title','Evidencia de tarea'),160)) returning id into eid;
 else
   raise exception 'Operación desconocida';
 end case;
 insert into public.audit_events(actor_id,action,entity_id) values(uid,action,coalesce(eid::text,''));
 return jsonb_build_object('id',eid);
end $$;

revoke all on public.tasks,public.monthly_skill_goals from anon,authenticated;
grant select on public.tasks,public.monthly_skill_goals to authenticated;
grant execute on function public.can_task(public.tasks),public.magic_task_command(text,jsonb) to authenticated;
grant all on public.tasks,public.monthly_skill_goals to service_role;
