import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Secret-key client. Server-side scripts only (seed/import). Bypasses RLS: never use in request handlers. */
export function createAdminSupabase(url = process.env.NEXT_PUBLIC_SUPABASE_URL, secretKey = process.env.SUPABASE_SECRET_KEY) {
  if (!url || !secretKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

let sharedCacheClient: SupabaseClient | null = null;

/**
 * Secret-key client memoized for `product_search_cache` / `offers_cache`
 * (see `@/lib/cache`'s `SharedCache`). A narrow, deliberate exception to
 * "never use [the admin client] in request handlers": those two tables have
 * RLS enabled with no policies for any client role at all, so the service
 * role is the only way to reach them, and they hold no user data - only
 * provider search/offer results keyed by query + provider.
 */
export function getSharedCacheClient(): SupabaseClient {
  sharedCacheClient ??= createAdminSupabase();
  return sharedCacheClient;
}
