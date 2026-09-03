-- Manual rollback plan for 20260902072445_rbac_storage_rpc_hardening.sql.
-- Do not run automatically. Restore only after confirming the impact and taking a backup.

begin;

drop policy if exists "Museum admins insert specimens" on public.specimens;
drop policy if exists "Museum admins update specimens" on public.specimens;
drop policy if exists "Museum admins delete specimens" on public.specimens;
drop policy if exists "Museum admins manage groups" on public.specimen_groups;
drop policy if exists "Museum admins manage sites" on public.collection_sites;
drop policy if exists "Museum admins manage specimen images" on public.specimen_images;
drop policy if exists "Museum admins upload specimen images" on storage.objects;
drop policy if exists "Museum admins update specimen images" on storage.objects;
drop policy if exists "Museum admins delete specimen images" on storage.objects;

create policy "Admin insert specimens" on public.specimens
  for insert with check (auth.role() = 'authenticated');
create policy "Admin update specimens" on public.specimens
  for update using (auth.role() = 'authenticated');
create policy "Admin delete specimens" on public.specimens
  for delete using (auth.role() = 'authenticated');
create policy "Admin manage groups" on public.specimen_groups
  for all using (auth.role() = 'authenticated');
create policy "Admin manage sites" on public.collection_sites
  for all using (auth.role() = 'authenticated');
create policy "Admin manage images" on public.specimen_images
  for all using (auth.role() = 'authenticated');
create policy "Admin upload specimen images" on storage.objects
  for insert with check (bucket_id = 'specimen-images' and auth.role() = 'authenticated');
create policy "Admin delete specimen images" on storage.objects
  for delete using (bucket_id = 'specimen-images' and auth.role() = 'authenticated');

update storage.buckets
set file_size_limit = null, allowed_mime_types = null
where id = 'specimen-images';

revoke all on table public.specimens, public.specimen_groups, public.collection_sites, public.specimen_images from anon, authenticated;
grant select on table public.specimens, public.specimen_groups, public.collection_sites, public.specimen_images to anon, authenticated;
grant insert, update, delete on table public.specimens, public.specimen_groups, public.collection_sites, public.specimen_images to authenticated;

revoke all on table storage.objects from anon, authenticated;
grant select on table storage.objects to anon, authenticated;
grant insert, delete on table storage.objects to authenticated;

commit;
