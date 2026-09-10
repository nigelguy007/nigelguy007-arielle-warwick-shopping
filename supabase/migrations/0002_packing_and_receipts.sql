-- Moving-day packing mode + receipt capture.
-- Adds a free-text "which box" label to per-user checklist state, and an
-- optional receipt image reference to purchases. Both tables already have
-- RLS enabled with owner-only policies (see 0001_init.sql); no new policies
-- are needed since these are plain columns on existing protected tables.

alter table public.user_checklist
  add column if not exists box text not null default '';

-- Local/dev mode stores a base64 data URL directly in this column for
-- simplicity. In production this should instead hold a Supabase Storage
-- object path/URL once a receipts bucket + upload flow is wired up.
alter table public.purchases
  add column if not exists receipt_image text;
