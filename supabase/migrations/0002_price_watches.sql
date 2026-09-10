-- Price watch: the last price recorded per tracked basket line, so the alerts
-- cron (recommendation #4 in HANDOFF.md) can tell whether a price genuinely
-- dropped since the previous check. Owner-only RLS; the alerts cron reads and
-- writes this with the service-role (secret key) client, which bypasses RLS.

create table if not exists public.price_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  label text not null default '',
  retailer text not null default '',
  last_price numeric(10,2) not null check (last_price >= 0),
  currency text not null default 'GBP',
  product_url text,
  last_checked_at timestamptz not null default now(),
  unique (user_id, item_key)
);
create index if not exists price_watches_user_idx on public.price_watches(user_id);

alter table public.price_watches enable row level security;

drop policy if exists price_watches_own on public.price_watches;
create policy price_watches_own on public.price_watches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
