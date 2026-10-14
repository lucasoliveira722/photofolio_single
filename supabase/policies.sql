-- Run in the Supabase SQL editor before the site goes live; safe to re-run.
-- Makes categories and images readable by anyone and writable only with the
-- service-role key (which bypasses row-level security).

alter table categories enable row level security;
alter table images enable row level security;

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
