-- Run in the Supabase SQL editor before the site goes live; safe to re-run.
-- Anyone can read categories and images. Writes are allowed only for the
-- admin account (a row in `admins`) or the service-role key, which bypasses
-- row-level security.

alter table categories enable row level security;
alter table images enable row level security;
-- admins has no policies on purpose: it is readable only through is_admin().
alter table admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Public read

drop policy if exists "Public can read categories" on categories;
create policy "Public can read categories"
  on categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read images" on images;
create policy "Public can read images"
  on images for select
  to anon, authenticated
  using (true);

-- Admin writes

drop policy if exists "Admin can insert categories" on categories;
create policy "Admin can insert categories"
  on categories for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admin can update categories" on categories;
create policy "Admin can update categories"
  on categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin can delete categories" on categories;
create policy "Admin can delete categories"
  on categories for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Admin can insert images" on images;
create policy "Admin can insert images"
  on images for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admin can update images" on images;
create policy "Admin can update images"
  on images for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin can delete images" on images;
create policy "Admin can delete images"
  on images for delete
  to authenticated
  using (public.is_admin());

-- Photo files (the bucket stays public for reads through public URLs)

drop policy if exists "Admin can read image files" on storage.objects;
create policy "Admin can read image files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'portfolio-images' and public.is_admin());

drop policy if exists "Admin can upload image files" on storage.objects;
create policy "Admin can upload image files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portfolio-images' and public.is_admin());

drop policy if exists "Admin can delete image files" on storage.objects;
create policy "Admin can delete image files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portfolio-images' and public.is_admin());

-- Reordering: one statement, so a reorder never half-applies. Runs as the
-- caller, so the admin write policies above still apply.

create or replace function public.reorder_categories(ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update categories set display_order = t.ord - 1
  from unnest(ids) with ordinality as t(id, ord)
  where categories.id = t.id;
$$;

create or replace function public.reorder_images(ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update images set display_order = t.ord - 1
  from unnest(ids) with ordinality as t(id, ord)
  where images.id = t.id;
$$;
