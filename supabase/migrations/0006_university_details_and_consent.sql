-- University location + year of study, captured in onboarding's new first
-- step, and GDPR consent proof (terms_accepted_at is stamped server-side by
-- the /api/profile route, never client-supplied) for the terms step shown
-- right after. terms_version lets a later material change to the terms
-- require re-consent by comparing against TERMS_VERSION in
-- src/lib/legal/terms.ts.
alter table public.profiles
  add column if not exists university_location text,
  add column if not exists year_of_study text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;
