import { createClient } from "@supabase/supabase-js";

/** Secret-key client. Server-side scripts only (seed/import). Bypasses RLS: never use in request handlers. */
export function createAdminSupabase(url = process.env.NEXT_PUBLIC_SUPABASE_URL, secretKey = process.env.SUPABASE_SECRET_KEY) {
  if (!url || !secretKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
