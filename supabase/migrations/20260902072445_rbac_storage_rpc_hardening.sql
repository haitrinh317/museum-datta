-- Security hardening: explicit museum-admin RBAC, storage constraints and RPC safety.
-- Deployment note: the intended admin must sign out and sign in again after this migration
-- so their JWT receives the new app_metadata claim.

begin;

-- Bootstrap exactly one existing operator without storing their email in source control.
-- app_metadata is server-managed; clients must never be authorized from user_metadata.
do $$
declare
  matched_admin_count integer;
begin
  update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{museum_role}',
    '"museum_admin"'::jsonb,
    true
  )
  where md5(lower(email)) = '4687d909a858be161f4bdf3e8e7fcd9a';

  get diagnostics matched_admin_count = row_count;

  if matched_admin_count <> 1 then
    raise exception
      'RBAC hardening aborted: expected exactly one configured museum admin, found %',
      matched_admin_count;
  end if;
end;
$$;

-- The old policies treat every authenticated user as an administrator.
drop policy if exists "Admin insert specimens" on public.specimens;
drop policy if exists "Admin update specimens" on public.specimens;
drop policy if exists "Admin delete specimens" on public.specimens;
drop policy if exists "Admin manage groups" on public.specimen_groups;
drop policy if exists "Admin manage sites" on public.collection_sites;
drop policy if exists "Admin manage images" on public.specimen_images;

create policy "Museum admins insert specimens"
  on public.specimens
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin');

create policy "Museum admins update specimens"
  on public.specimens
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin');

create policy "Museum admins delete specimens"
  on public.specimens
  for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin');

create policy "Museum admins manage groups"
  on public.specimen_groups
  for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin');

create policy "Museum admins manage sites"
  on public.collection_sites
  for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin');

create policy "Museum admins manage specimen images"
  on public.specimen_images
  for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin');

-- Data API grants complement RLS: anonymous users can read; only authenticated
-- users can request writes, and their RLS policy still requires museum_admin.
revoke all on table public.specimens, public.specimen_groups, public.collection_sites, public.specimen_images from anon, authenticated;
grant select on table public.specimens, public.specimen_groups, public.collection_sites, public.specimen_images to anon, authenticated;
grant insert, update, delete on table public.specimens, public.specimen_groups, public.collection_sites, public.specimen_images to authenticated;

-- Public exhibit images remain readable but uploads are restricted to museum admins.
update storage.buckets
set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'specimen-images';

drop policy if exists "Admin upload specimen images" on storage.objects;
drop policy if exists "Admin delete specimen images" on storage.objects;

create policy "Museum admins upload specimen images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'specimen-images'
    and (select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin'
  );

create policy "Museum admins update specimen images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'specimen-images'
    and (select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin'
  )
  with check (
    bucket_id = 'specimen-images'
    and (select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin'
  );

create policy "Museum admins delete specimen images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'specimen-images'
    and (select auth.jwt() -> 'app_metadata' ->> 'museum_role') = 'museum_admin'
  );

revoke all on table storage.objects from anon, authenticated;
grant select on table storage.objects to anon, authenticated;
grant insert, update, delete on table storage.objects to authenticated;

-- Keep public computed-column search working, but make function lookup deterministic.
alter function public.update_updated_at_column() set search_path = pg_catalog, public;
alter function public.search_text(public.specimens) set search_path = pg_catalog, public;

commit;
