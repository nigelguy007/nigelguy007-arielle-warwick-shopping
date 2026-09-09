import "server-only";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { LOCAL_DEMO_USER_ID } from "@/lib/store/local";
import { createServerSupabase } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
  mode: "local" | "supabase";
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (env.dataMode === "local") return { id: LOCAL_DEMO_USER_ID, email: null, mode: "local" };
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null, mode: "supabase" };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For route handlers: returns a 401 Response instead of redirecting. */
export async function requireUserOr401(): Promise<CurrentUser | Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  return user;
}
