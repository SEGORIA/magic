-- Run after 001_magic.sql on Supabase. No client storage policies: uploads are scoped signed grants.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('magic-private','magic-private',false,10485760,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create function public.consume_tv_activation(h text,s text) returns uuid language plpgsql security definer set search_path='' as $$
declare did uuid;
begin
 update public.tv_devices set activation_hash=null,activation_expires=null,session_hash=s,session_expires=now()+interval '30 days',last_seen_at=now()
 where activation_hash=h and activation_expires>now() and active returning id into did;
 return did;
end $$;
create function public.take_rate_limit(k text,max_hits int,window_seconds int) returns boolean language plpgsql security definer set search_path='' as $$
declare n int;
begin
 insert into public.rate_limits(key,hits,expires_at) values(k,1,now()+make_interval(secs=>window_seconds))
 on conflict(key) do update set hits=case when rate_limits.expires_at<now() then 1 else rate_limits.hits+1 end,
 expires_at=case when rate_limits.expires_at<now() then now()+make_interval(secs=>window_seconds) else rate_limits.expires_at end returning hits into n;
 return n<=max_hits;
end $$;
revoke all on function public.consume_tv_activation(text,text),public.take_rate_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.consume_tv_activation(text,text),public.take_rate_limit(text,int,int) to service_role;

create function public.finalize_media(mid uuid,actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare m public.media; admin boolean;
begin
 select * into m from public.media where id=mid and owner_id=actor for update;
 if m.id is null or not exists(select 1 from public.profiles where id=actor and active) then raise exception 'Carga no disponible'; end if;
 if m.status<>'uploading' then return; end if;
 select exists(select 1 from public.user_roles where user_id=actor and role='admin') into admin;
 if m.kind='official' and not admin then raise exception 'Permiso retirado'; end if;
 if m.kind='athlete' and not (admin or exists(select 1 from public.guardian_athletes where user_id=actor and athlete_id=m.athlete_id)) then raise exception 'Vínculo retirado'; end if;
 update public.media set object_path='processed/'||mid::text||'.webp',status=case when kind='avatar' then 'approved' else 'pending' end where id=mid;
 if m.kind='avatar' then
   update public.media set status='withdrawn',tv=false,portal=false where id=(select avatar_id from public.profiles where id=actor);
   update public.profiles set avatar_id=mid where id=actor;
 end if;
 if m.kind='athlete' then
   update public.media set status='withdrawn',tv=false,portal=false where id=(select photo_id from public.athletes where id=m.athlete_id);
   update public.athletes set photo_id=mid where id=m.athlete_id;
 end if;
 insert into public.audit_events(actor_id,action,entity_id) values(actor,'media_finalize',mid::text);
end $$;
revoke all on function public.finalize_media(uuid,uuid) from public,anon,authenticated;
grant execute on function public.finalize_media(uuid,uuid) to service_role;
