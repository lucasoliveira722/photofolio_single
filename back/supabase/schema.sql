create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  storage_path text not null,
  title text not null,
  description text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  width integer not null,
  height integer not null,
  created_at timestamptz not null default now()
);

create index images_category_id_idx on images(category_id);
