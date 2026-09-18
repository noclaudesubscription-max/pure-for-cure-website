-- ════════════════════════════════════════════════════
--  Pure for Cure — Supabase schema & policies
--  Run this once in: Supabase Dashboard → SQL Editor → New Query
-- ════════════════════════════════════════════════════

-- Donations table (Razorpay donations + manual entries from dashboard)
create table if not exists public.donations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date       date,
  name       text,
  email      text,
  phone      text,
  amount     numeric,
  location   text,
  method     text,
  status     text,
  txn_id     text,
  notes      text
);

-- Volunteers table (registrations from donate.html volunteer form)
create table if not exists public.volunteers (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date       date,
  name       text,
  email      text,
  phone      text,
  area       text,
  message    text
);

-- Enable Row Level Security
alter table public.donations  enable row level security;
alter table public.volunteers enable row level security;

-- Allow anyone (anon key) to INSERT — needed so the public donation/volunteer
-- forms on donate.html can write rows.
create policy "Public can insert donations"
  on public.donations for insert
  to anon
  with check (true);

create policy "Public can insert volunteers"
  on public.volunteers for insert
  to anon
  with check (true);

-- Allow anyone with the anon key to SELECT (read) — needed for the
-- Recent Donors strip on index.html and the dashboard tables.
create policy "Public can read donations"
  on public.donations for select
  to anon
  using (true);

create policy "Public can read volunteers"
  on public.volunteers for select
  to anon
  using (true);

-- Allow UPDATE/DELETE so the dashboard (Add/Delete Payment, Delete
-- Volunteer, Clear Data) can manage rows.
-- NOTE: the dashboard's "password" is only a client-side UI gate, not real
-- Supabase auth — anyone with your anon key could technically also delete
-- rows. This is acceptable for a small site, but if you want stronger
-- protection later, switch to Supabase Auth + restrict these policies to
-- authenticated admin users.
create policy "Public can update donations"
  on public.donations for update
  to anon
  using (true);

create policy "Public can delete donations"
  on public.donations for delete
  to anon
  using (true);

create policy "Public can update volunteers"
  on public.volunteers for update
  to anon
  using (true);

create policy "Public can delete volunteers"
  on public.volunteers for delete
  to anon
  using (true);

-- Storage: "receipts" bucket (donation receipt PDFs, generated client-side
-- in donate.html and emailed to donors via EmailJS as a link). The bucket
-- itself must be created manually in Supabase Dashboard → Storage → New
-- bucket, named "receipts", marked Public. Marking it Public only allows
-- reads — these two policies are still required for the anon key to be
-- able to upload (insert) and read files inside it.
create policy "Allow anon uploads to receipts"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'receipts');

create policy "Allow anon read receipts"
  on storage.objects for select
  to anon
  using (bucket_id = 'receipts');

-- ════════════════════════════════════════════════════
-- Gallery entries (homepage "General Gallery" + per-location
-- Seva Memories pages: borooah / gmch / aiims / other).
-- Replaces the old localStorage-only gallery manager so photo
-- changes made in the dashboard are visible to every visitor
-- immediately, not just on the admin's own browser.
-- ════════════════════════════════════════════════════
create table if not exists public.gallery_entries (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz default now(),
  location           text not null, -- 'general' | 'borooah' | 'gmch' | 'aiims' | 'other'
  name               text,          -- donor name (per-location entries); unused for 'general'
  initials           text,
  caption            text,          -- photo caption/alt text (used by 'general' gallery)
  date_label         text,          -- display date string, e.g. "15 March 2025"
  date_iso           date,
  specific_location  text,          -- for 'other' location entries
  photos             jsonb not null default '[]'::jsonb, -- array of image URLs/paths
  sort_order         integer default 0
);

alter table public.gallery_entries enable row level security;

create policy "Public can read gallery entries"
  on public.gallery_entries for select
  to anon
  using (true);

create policy "Public can insert gallery entries"
  on public.gallery_entries for insert
  to anon
  with check (true);

create policy "Public can update gallery entries"
  on public.gallery_entries for update
  to anon
  using (true);

create policy "Public can delete gallery entries"
  on public.gallery_entries for delete
  to anon
  using (true);

create index if not exists gallery_entries_location_idx on public.gallery_entries (location);

-- Storage: "gallery" bucket (photos uploaded from the dashboard's Gallery
-- Manager). Created automatically below and marked Public for reads.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "Allow anon uploads to gallery"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'gallery');

create policy "Allow anon read gallery"
  on storage.objects for select
  to anon
  using (bucket_id = 'gallery');

create policy "Allow anon delete gallery"
  on storage.objects for delete
  to anon
  using (bucket_id = 'gallery');

-- ════════════════════════════════════════════════════
-- Homepage banner carousel, managed from the dashboard's
-- Banners section. The homepage reads only enabled banners
-- (ordered by sort_order) and only when the master
-- 'homepage_banner_enabled' setting is true.
-- ════════════════════════════════════════════════════
create table if not exists public.banners (
  id               uuid primary key default gen_random_uuid(),
  title            text default '',
  image_url        text not null default '', -- desktop/default banner (used on desktop, tablet, and mobile fallback)
  mobile_image_url text default '',           -- optional mobile-only banner; falls back to image_url when empty
  link_url         text default '',
  enabled          boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Backward-compatible: adds the column if this script runs against a DB
-- created before mobile banners existed.
alter table public.banners add column if not exists mobile_image_url text default '';

alter table public.banners enable row level security;

create policy "Public can read banners"
  on public.banners for select to anon using (true);
create policy "Public can insert banners"
  on public.banners for insert to anon with check (true);
create policy "Public can update banners"
  on public.banners for update to anon using (true);
create policy "Public can delete banners"
  on public.banners for delete to anon using (true);

create index if not exists banners_sort_order_idx on public.banners (sort_order);

-- Generic site-wide settings (key/value) — reusable beyond just banners.
create table if not exists public.site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

alter table public.site_settings enable row level security;

create policy "Public can read settings"
  on public.site_settings for select to anon using (true);
create policy "Public can upsert settings"
  on public.site_settings for insert to anon with check (true);
create policy "Public can update settings"
  on public.site_settings for update to anon using (true);

insert into public.site_settings (key, value)
values ('homepage_banner_enabled', 'true')
on conflict (key) do nothing;

-- Storage: "banners" bucket (banner images uploaded from the dashboard).
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

create policy "Allow anon uploads to banners"
  on storage.objects for insert to anon with check (bucket_id = 'banners');
create policy "Allow anon read banners-bucket"
  on storage.objects for select to anon using (bucket_id = 'banners');
create policy "Allow anon delete banners-bucket"
  on storage.objects for delete to anon using (bucket_id = 'banners');
