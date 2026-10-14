-- Run once in the Supabase SQL editor.
-- Makes categories and images readable by anyone and writable only with the
-- service-role key (which bypasses row-level security).

alter table categories enable row level security;
alter table images enable row level security;

create policy "Public can read categories"
  on categories for select
  to anon, authenticated
  using (true);

create policy "Public can read images"
  on images for select
  to anon, authenticated
  using (true);
