import "server-only";
import { env } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Looks up a user's email for sending alerts. Local demo mode has no real
 * sign-in, so it always returns null there - the alerts job falls back to the
 * console notifier for that user rather than fabricating a delivery address.
 */
export async function resolveUserEmail(userId: string): Promise<string | null> {
  if (env.dataMode !== "supabase") return null;
  const admin = createAdminSupabase();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email ?? null;
}
