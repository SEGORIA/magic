-- Administration can correct a coach profile while keeping the coach-owned edit flow.
create or replace function public.magic_coach_command(action text,d jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); target uuid:=coalesce(nullif(d->>'user_id','')::uuid,auth.uid()); eid uuid;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and active) then raise exception 'Acceso no autorizado'; end if;
 if length(d::text)>30000 then raise exception 'Solicitud demasiado grande'; end if;
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
 elsif action='coach_profile_admin_update' then
   if not public.is_admin() then raise exception 'Solo administración'; end if;
   update public.profiles set name=left(trim(coalesce(d->>'name','')),120) where id=target;
   if not found then raise exception 'Perfil de entrenador no encontrado'; end if;
   insert into public.coach_profiles(user_id,headline,bio,phone,specialty,admin_approved,admin_note)
   values(target,left(trim(coalesce(d->>'headline','')),120),left(trim(coalesce(d->>'bio','')),1200),left(trim(coalesce(d->>'phone','')),40),left(trim(coalesce(d->>'specialty','')),160),coalesce((d->>'approved')::boolean,false),left(trim(coalesce(d->>'admin_note','')),500))
   on conflict(user_id) do update set headline=excluded.headline,bio=excluded.bio,phone=excluded.phone,specialty=excluded.specialty,admin_approved=excluded.admin_approved,admin_note=excluded.admin_note,updated_at=now()
   returning user_id into eid;
 else raise exception 'Operación desconocida'; end if;
 insert into public.audit_events(actor_id,action,entity_id) values(uid,action,eid::text);
 return jsonb_build_object('id',eid);
end $$;
