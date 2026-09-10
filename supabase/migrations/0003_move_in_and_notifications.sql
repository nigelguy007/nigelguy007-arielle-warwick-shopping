-- Move-in date (drives the Home screen countdown) and notification
-- preference toggles (Me screen) from the "Apple design" handoff.
alter table public.profiles
  add column if not exists move_in_date date,
  add column if not exists notify_price_alerts boolean not null default true,
  add column if not exists notify_voucher_expiry boolean not null default true,
  add column if not exists notify_weekly_digest boolean not null default false;
