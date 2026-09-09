-- pgTAP RLS isolation tests. Run with: supabase test db
begin;
select plan(6);

-- Two fake users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'arielle@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'someone@example.com')
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

select is((select count(*) from public.user_checklist), 1::bigint, 'owner sees own checklist row');
select is((select count(*) from public.budgets), 1::bigint, 'owner sees own budget');

-- Act as user 2: must see nothing of user 1
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*) from public.user_checklist), 0::bigint, 'other user cannot read checklist');
select is((select count(*) from public.budgets), 0::bigint, 'other user cannot read budgets');
select is((select count(*) from public.basket_items), 0::bigint, 'other user cannot read basket');
select throws_ok(
  $$ insert into public.budgets (user_id, amount) values ('00000000-0000-0000-0000-000000000001', 1) $$,
  '42501',
  null,
  'other user cannot write into owner budgets'
);

select * from finish();
rollback;
