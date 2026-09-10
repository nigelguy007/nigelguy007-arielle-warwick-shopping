-- pgTAP RLS isolation tests. Run with: supabase test db
begin;
select plan(15);

-- Three fake users: an owner, an unrelated stranger, and a parent who will redeem a share invite
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'arielle@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'someone@example.com'),
  ('00000000-0000-0000-0000-000000000003', 'parent@example.com')
on conflict do nothing;

insert into public.checklist_items (id, source_key, category, item) values
  ('10000000-0000-0000-0000-000000000001', 'test/duvet', 'Bedding', 'Duvet')
on conflict do nothing;

-- Act as user 1 and write private rows
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.user_checklist (user_id, checklist_item_id, status) values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'buy');
insert into public.budgets (user_id, amount) values ('00000000-0000-0000-0000-000000000001', 200);
insert into public.basket_items (user_id, product_snapshot, quantity) values ('00000000-0000-0000-0000-000000000001', '{"id":"x"}'::jsonb, 1);
insert into public.price_watches (user_id, item_key, label, retailer, last_price) values ('00000000-0000-0000-0000-000000000001', 'test/duvet', 'Duvet', 'Dunelm', 14);

select is((select count(*) from public.user_checklist), 1::bigint, 'owner sees own checklist row');
select is((select count(*) from public.budgets), 1::bigint, 'owner sees own budget');
select is((select count(*) from public.price_watches), 1::bigint, 'owner sees own price watch');

-- Act as user 2: must see nothing of user 1
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*) from public.user_checklist), 0::bigint, 'other user cannot read checklist');
select is((select count(*) from public.budgets), 0::bigint, 'other user cannot read budgets');
select is((select count(*) from public.basket_items), 0::bigint, 'other user cannot read basket');
select is((select count(*) from public.price_watches), 0::bigint, 'other user cannot read price watches');
select throws_ok(
  $$ insert into public.budgets (user_id, amount) values ('00000000-0000-0000-0000-000000000001', 1) $$,
  '42501',
  null,
  'other user cannot write into owner budgets'
);

-- Parent sharing: back to user 1 (owner), who creates a share invite
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.share_invites (owner_id, code, expires_at) values ('00000000-0000-0000-0000-000000000001', 'TESTCODE1', now() + interval '1 day');
insert into public.share_invites (owner_id, code, expires_at) values ('00000000-0000-0000-0000-000000000001', 'TESTCODE2', now() + interval '1 day');

select throws_ok(
  $$ select public.redeem_share_invite('TESTCODE1') $$,
  'P0001',
  'You cannot redeem your own invite link.',
  'owner cannot redeem their own invite'
);

-- The parent (user 3) redeems it
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
select lives_ok($$ select public.redeem_share_invite('TESTCODE1') $$, 'parent redeems a valid invite');
select is((select count(*) from public.shared_access where owner_id = '00000000-0000-0000-0000-000000000001' and viewer_id = '00000000-0000-0000-0000-000000000003'), 1::bigint, 'redeeming created a shared_access row');
select is((select count(*) from public.user_checklist), 1::bigint, 'shared parent can read owner checklist');
select is((select count(*) from public.budgets), 1::bigint, 'shared parent can read owner budget');
select throws_ok(
  $$ select public.redeem_share_invite('TESTCODE1') $$,
  'P0001',
  'This invite link is invalid or has expired.',
  'a redeemed code cannot be redeemed again'
);

-- The unrelated stranger (user 2) still sees nothing, even with an invite outstanding
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*) from public.user_checklist), 0::bigint, 'unrelated user still cannot read checklist after sharing with someone else');

select * from finish();
rollback;
