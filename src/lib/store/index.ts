import "server-only";
import path from "node:path";
import { env } from "@/lib/env";
import { LocalStore, LOCAL_DEMO_USER_ID } from "./local";
import { SupabaseStore } from "./supabase";
import { seedStore } from "./seed";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { AdminStore, DataStore } from "./types";

const g = globalThis as unknown as { __awLocalStore?: LocalStore; __awLocalSeeded?: Promise<void> };

export function getLocalStore(): LocalStore {
  if (!g.__awLocalStore) g.__awLocalStore = new LocalStore(path.isAbsolute(env.localDataDir) ? env.localDataDir : path.resolve(process.cwd(), env.localDataDir));
  return g.__awLocalStore;
}

async function ensureLocalSeeded(store: LocalStore) {
  if (!store.isEmpty) return;
  g.__awLocalSeeded ??= (async () => {
    await seedStore(store, { userId: LOCAL_DEMO_USER_ID });
    await store.upsertProfile(LOCAL_DEMO_USER_ID, { firstName: env.demoFirstName, university: "University of Warwick" });
  })();
  await g.__awLocalSeeded;
}

/** Store bound to the current request's user. */
export async function getStore(): Promise<DataStore> {
  if (env.dataMode === "local") {
    const store = getLocalStore();
    await ensureLocalSeeded(store);
    return store;
  }
  return new SupabaseStore(await createServerSupabase());
}

/**
 * Store bound with admin (secret-key) credentials, bypassing RLS. Only for the
 * cron-triggered alerts job (`/api/alerts/run`), which is authenticated by a
 * shared secret rather than a signed-in user's cookies and must read/write every
 * user's rows explicitly by id - never use this for a normal user-facing request.
 */
export async function getAdminStore(): Promise<DataStore & AdminStore> {
  if (env.dataMode === "local") {
    const store = getLocalStore();
    await ensureLocalSeeded(store);
    return store;
  }
  return new SupabaseStore(createAdminSupabase());
}

export { LOCAL_DEMO_USER_ID };
