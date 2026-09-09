import "server-only";
import path from "node:path";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { LocalStore, LOCAL_DEMO_USER_ID } from "./local";
import { SupabaseStore } from "./supabase";
import { seedStore } from "./seed";
import { loadBaseData } from "./base-data";
import { DeltaStore, emptyDelta, type UserDelta } from "./delta-store";
import { decodeState, encodeState, readChunks, writeChunks } from "./cookie-codec";
import { createServerSupabase } from "@/lib/supabase/server";
import type { DataStore } from "./types";

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

/** Demo state lives in the visitor's cookies: serverless functions share no filesystem. */
async function getCookieDemoStore(): Promise<DataStore> {
  const jar = await cookies();
  const encoded = readChunks((name) => jar.get(name)?.value);
  const delta = (encoded && decodeState<UserDelta>(encoded)) || emptyDelta();
  if (delta.v !== 1) Object.assign(delta, emptyDelta());
  const persist = (next: UserDelta) => {
    try {
      for (const w of writeChunks(encodeState(next))) {
        if (w.remove) jar.delete(w.name);
        else jar.set(w.name, w.value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
      }
    } catch (err) {
      // Server Components cannot set cookies; only route handlers write, so this is expected there.
      log.warn("demo.cookie.persist_failed", { error: err instanceof Error ? err.message : String(err) });
    }
  };
  return new DeltaStore(loadBaseData(), delta, persist, { firstName: env.demoFirstName });
}

/** Store bound to the current request's user. */
export async function getStore(): Promise<DataStore> {
  if (env.dataMode === "local") {
    if (env.localStoreKind === "cookie") return getCookieDemoStore();
    const store = getLocalStore();
    await ensureLocalSeeded(store);
    return store;
  }
  return new SupabaseStore(await createServerSupabase());
}

export { LOCAL_DEMO_USER_ID };
