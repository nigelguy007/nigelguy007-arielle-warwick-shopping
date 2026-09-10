-- Lets a student add their own free-text items to the checklist, alongside
-- the shared base list. owner_id null = shared/global (the base 77);
-- owner_id set = that user's own item, never visible to anyone else.
alter table public.checklist_items
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists is_custom boolean not null default false;

create index if not exists checklist_items_owner_id_idx on public.checklist_items (owner_id);

-- Replace the "everyone sees every row" policy with one scoped to shared +
-- own custom rows.
drop policy if exists checklist_items_read on public.checklist_items;
create policy checklist_items_read on public.checklist_items
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists checklist_items_insert_own on public.checklist_items;
create policy checklist_items_insert_own on public.checklist_items
  for insert to authenticated
  with check (owner_id = auth.uid() and is_custom = true);
