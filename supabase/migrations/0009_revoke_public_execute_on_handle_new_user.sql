-- handle_new_user is a trigger function (invoked by the on_auth_user_created
-- trigger on auth.users), never meant to be called directly. Postgres grants
-- EXECUTE to PUBLIC by default, which the security linter flags because it
-- makes the function reachable as a PostgREST RPC endpoint. Revoke that;
-- the trigger itself runs as the function owner regardless of these grants.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
