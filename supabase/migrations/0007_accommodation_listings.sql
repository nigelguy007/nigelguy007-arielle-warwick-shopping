-- Reference data for the accommodation-scraper pipeline
-- (scripts/scrape-accommodation.ts), separate from accommodation_profiles
-- (Warwick-specific, hand-verified room facts used for compatibility
-- filtering elsewhere in the app). This is commercial pricing/contract
-- data scraped from each university's own accommodation pages, for any
-- UK university - never guessed: a null column means "not found on the
-- source page", not "assumed".
create table if not exists public.universities (
  ukprn text primary key,
  name text not null,
  country text,
  website_url text,
  website_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accommodation_listings (
  id uuid primary key default gen_random_uuid(),
  university_ukprn text not null references public.universities(ukprn) on delete cascade,
  university_name text not null,
  accommodation_name text not null,
  room_type text,
  weekly_price numeric,
  contract_length text,
  total_cost numeric,
  bathroom_type text,
  catering_type text,
  address text,
  academic_year text,
  source_url text not null,
  last_checked timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_ukprn, accommodation_name, room_type, academic_year)
);
create index if not exists accommodation_listings_university_idx on public.accommodation_listings(university_ukprn);

alter table public.universities enable row level security;
alter table public.accommodation_listings enable row level security;

-- Reference data, not per-user: readable by any authenticated user (same
-- pattern as accommodation_profiles' accommodation_read policy in
-- 0001_init.sql), written only by the service-role scraper script.
drop policy if exists universities_read on public.universities;
create policy universities_read on public.universities for select to authenticated using (true);
drop policy if exists accommodation_listings_read on public.accommodation_listings;
create policy accommodation_listings_read on public.accommodation_listings for select to authenticated using (true);
