-- MFA remains available in the account settings, but is not required for this
-- small initial administration team.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.has_role('admin')
$$;
