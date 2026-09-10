-- A student connecting a retailer so its prices/stock can be read directly.
-- A row only ever exists once they've actually authorized it (the Shop
-- screen never persists the idle/searching/found in-progress states).
create table if not exists public.store_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  retailer text not null,
  method text not null check (method in ('API', 'MCP')),
  connected_at timestamptz not null default now(),
  unique (user_id, retailer)
);

alter table public.store_connections enable row level security;

drop policy if exists store_connections_owner on public.store_connections;
create policy store_connections_owner on public.store_connections
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
