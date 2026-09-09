/**
 * RLS user-isolation test against a real Supabase project.
 * Needs: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY.
 * Creates two throwaway users, writes private rows as user A, asserts user B sees nothing.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const enabled = Boolean(url && anon && secret);

describe.runIf(enabled)("Supabase RLS isolation", () => {
  let admin: SupabaseClient;
  const users: Array<{ id: string; client: SupabaseClient }> = [];

  beforeAll(async () => {
    admin = createClient(url as string, secret as string, { auth: { persistSession: false } });
    for (const n of ["a", "b"]) {
      const email = `rls-${n}-${Date.now()}@example.com`;
      const password = `Test-${Math.random().toString(36).slice(2)}-Aa1!`;
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;
      const client = createClient(url as string, anon as string, { auth: { persistSession: false } });
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      users.push({ id: data.user.id, client });
    }
  });
  afterAll(async () => {
    for (const u of users) await admin.auth.admin.deleteUser(u.id);
  });

  it("user B cannot read or write user A's private rows", async () => {
    const [a, b] = users;
    const { data: items } = await a.client.from("checklist_items").select("id").limit(1);
    expect(items?.length).toBe(1);
    const itemId = items![0].id as string;

    expect((await a.client.from("user_checklist").insert({ user_id: a.id, checklist_item_id: itemId, status: "buy" })).error).toBeNull();
    expect((await a.client.from("budgets").insert({ user_id: a.id, amount: 150 })).error).toBeNull();
    expect((await a.client.from("basket_items").insert({ user_id: a.id, product_snapshot: { id: "x" }, quantity: 1 })).error).toBeNull();

    expect((await b.client.from("user_checklist").select("*")).data).toEqual([]);
    expect((await b.client.from("budgets").select("*")).data).toEqual([]);
    expect((await b.client.from("basket_items").select("*")).data).toEqual([]);
    expect((await b.client.from("purchases").select("*")).data).toEqual([]);
    expect((await b.client.from("profiles").select("*").eq("id", a.id)).data).toEqual([]);

    const forged = await b.client.from("budgets").insert({ user_id: a.id, amount: 1 });
    expect(forged.error).not.toBeNull();
    const spoof = await b.client.from("checklist_items").insert({ source_key: "hack/x", category: "x", item: "x" });
    expect(spoof.error).not.toBeNull();
  });
});

describe.skipIf(enabled)("Supabase RLS isolation", () => {
  it.skip("skipped: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY to run", () => {});
});
