-- Search and read-path performance hardening.
-- This migration adds reproducible search/index support. Run a duplicate
-- check on collection_sites before adding any stricter uniqueness constraints.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Keep the production-only exhibit location field reproducible locally.
alter table public.specimens add column if not exists display_area text;

-- PostgREST computed field used by the public and admin search boxes.
-- Keep the normalization immutable so the trigram expression index can be used.
create or replace function public.unaccent_immutable(value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value);
$$;

create or replace function public.search_text(specimen public.specimens)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select lower(public.unaccent_immutable(concat_ws(' ',
    specimen.species,
    specimen.common_name_vi,
    specimen.family,
    specimen.specimen_code,
    specimen.morphology,
    specimen.distribution
  )));
$$;

create index if not exists idx_specimens_search_text_trgm
  on public.specimens using gin ((public.search_text(specimens)) extensions.gin_trgm_ops);

-- The original migration's FTS index is no longer used by the application;
-- avoid maintaining two large search indexes on every specimen write.
drop index if exists public.idx_specimens_fts;

-- Keep the gallery upsert contract aligned with the schema. Abort with a
-- useful message instead of failing later if legacy duplicate URLs exist.
do $$
begin
  if exists (
    select 1
    from public.specimen_images
    group by image_url
    having count(*) > 1
  ) then
    raise exception 'Duplicate specimen_images.image_url values must be reconciled before creating the unique index';
  end if;
end;
$$;

create unique index if not exists idx_specimen_images_image_url_unique
  on public.specimen_images (image_url);

create index if not exists idx_specimens_created_at_desc
  on public.specimens (created_at desc);

create index if not exists idx_specimens_serial_number_asc
  on public.specimens (serial_number asc nulls last);

-- specimen_code UNIQUE already owns a unique index; avoid maintaining a second
-- equivalent B-tree index on every insert/update.
drop index if exists public.idx_specimens_code;
