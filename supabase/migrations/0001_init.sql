-- Arielle's Warwick Move-In Shopping Agent: initial schema.
-- All user-owned tables have RLS enabled with owner-only policies.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type checklist_status as enum ('need','have','buy','bought','packed','wait','do_not_buy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checklist_priority as enum ('essential','recommended','optional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checklist_timing as enum ('buy_before','take_from_home','wait_until_arrival','do_not_buy_yet');
exception when duplicate_object then null; end $$;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  university text not null default 'University of Warwick',
  accommodation_name text,
  accommodation_slug text,
  default_postcode text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Base checklist (shared, read-only for users) ----------
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  category text not null,
  item text not null,
  priority checklist_priority not null default 'recommended',
  timing checklist_timing not null default 'buy_before',
  default_qty integer not null default 1 check (default_qty > 0),
  budget_estimate numeric(10,2),
  notes text not null default ''
);

-- ---------- Per-user checklist state ----------
create table if not exists public.user_checklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_item_id uuid not null references public.checklist_items(id) on delete cascade,
  status checklist_status not null default 'need',
  qty integer not null default 1 check (qty > 0),
  custom_notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, checklist_item_id)
);
create index if not exists user_checklist_user_idx on public.user_checklist(user_id);

-- ---------- Accommodation profiles (read-only for users) ----------
create table if not exists public.accommodation_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  official_url text not null,
  verified_at timestamptz,
  bed_size text,
  mattress_dimensions text,
  ensuite boolean,
  shared_bathroom boolean,
  kitchen_type text,
  hob_type text,
  supplied_appliances jsonb not null default '[]'::jsonb,
  prohibited_items jsonb not null default '[]'::jsonb,
  notes jsonb not null default '{}'::jsonb
);

-- ---------- Caches (server-side only; no user data) ----------
create table if not exists public.product_search_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null,
  location_key text not null,
  provider text not null,
  results jsonb not null,
  expires_at timestamptz not null,
  unique (query_hash, location_key, provider)
);
create table if not exists public.offers_cache (
  id uuid primary key default gen_random_uuid(),
  merchant_key text not null,
  provider text not null,
  results jsonb not null,
  expires_at timestamptz not null,
  unique (merchant_key, provider)
);

-- ---------- Basket / purchases / budgets ----------
create table if not exists public.basket_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_item_id uuid references public.checklist_items(id) on delete set null,
  product_snapshot jsonb not null,
  quantity integer not null default 1 check (quantity > 0),
  added_at timestamptz not null default now()
);
create index if not exists basket_items_user_idx on public.basket_items(user_id);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_item_id uuid references public.checklist_items(id) on delete set null,
  product_snapshot jsonb,
  retailer text not null default '',
  paid_price numeric(10,2) not null check (paid_price >= 0),
  voucher_used text,
  purchased_at timestamptz not null default now()
);
create index if not exists purchases_user_idx on public.purchases(user_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Move-in budget',
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'GBP',
  created_at timestamptz not null default now()
);
create index if not exists budgets_user_idx on public.budgets(user_id);

-- ---------- Optional sharing (parent role) ----------
create table if not exists public.shared_access (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role in ('parent')),
  can_view_checklist boolean not null default true,
  can_view_budget boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, viewer_id)
);

-- ---------- Auto-create profile on sign-up ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.checklist_items enable row level security;
alter table public.user_checklist enable row level security;
alter table public.accommodation_profiles enable row level security;
alter table public.product_search_cache enable row level security;
alter table public.offers_cache enable row level security;
alter table public.basket_items enable row level security;
alter table public.purchases enable row level security;
alter table public.budgets enable row level security;
alter table public.shared_access enable row level security;

-- profiles: owner only
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);

-- base checklist + accommodation: read-only for signed-in users; writes only via service role
drop policy if exists checklist_items_read on public.checklist_items;
create policy checklist_items_read on public.checklist_items for select to authenticated using (true);
drop policy if exists accommodation_read on public.accommodation_profiles;
create policy accommodation_read on public.accommodation_profiles for select to authenticated using (true);

-- caches: no client access at all (service role bypasses RLS)

-- user-owned tables: full owner access, optional read for a parent the owner shared with
drop policy if exists user_checklist_own on public.user_checklist;
create policy user_checklist_own on public.user_checklist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_checklist_shared_read on public.user_checklist;
create policy user_checklist_shared_read on public.user_checklist for select using (
  exists (select 1 from public.shared_access s where s.owner_id = user_checklist.user_id and s.viewer_id = auth.uid() and s.can_view_checklist)
);

drop policy if exists basket_items_own on public.basket_items;
create policy basket_items_own on public.basket_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists purchases_own on public.purchases;
create policy purchases_own on public.purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists purchases_shared_read on public.purchases;
create policy purchases_shared_read on public.purchases for select using (
  exists (select 1 from public.shared_access s where s.owner_id = purchases.user_id and s.viewer_id = auth.uid() and s.can_view_budget)
);

drop policy if exists budgets_own on public.budgets;
create policy budgets_own on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists budgets_shared_read on public.budgets;
create policy budgets_shared_read on public.budgets for select using (
  exists (select 1 from public.shared_access s where s.owner_id = budgets.user_id and s.viewer_id = auth.uid() and s.can_view_budget)
);

drop policy if exists shared_access_owner on public.shared_access;
create policy shared_access_owner on public.shared_access for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists shared_access_viewer_read on public.shared_access;
create policy shared_access_viewer_read on public.shared_access for select using (auth.uid() = viewer_id);
