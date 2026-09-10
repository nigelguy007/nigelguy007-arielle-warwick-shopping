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

  it("a parent redeeming a share invite gains exactly the granted read access, and only that", async () => {
    const [a, b] = users;
    const email = `rls-c-${Date.now()}@example.com`;
    const password = `Test-${Math.random().toString(36).slice(2)}-Aa1!`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    const c = createClient(url as string, anon as string, { auth: { persistSession: false } });
    const { error: signInError } = await c.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    const parent = { id: data.user.id, client: c };
    users.push(parent);

    // a shares only the checklist, not the budget
    const { data: invite, error: inviteError } = await a.client.from("share_invites").insert({ owner_id: a.id, code: `RLS${Date.now()}`, can_view_checklist: true, can_view_budget: false, expires_at: new Date(Date.now() + 3_600_000).toISOString() }).select("*").single();
    expect(inviteError).toBeNull();

    // the parent cannot read the invite directly (no select policy for non-owners)
    expect((await parent.client.from("share_invites").select("*").eq("id", invite!.id as string)).data).toEqual([]);

    // redeeming it (the owner cannot redeem their own invite)
    expect((await a.client.rpc("redeem_share_invite", { p_code: invite!.code as string })).error).not.toBeNull();
    const redeemed = await parent.client.rpc("redeem_share_invite", { p_code: invite!.code as string });
    expect(redeemed.error).toBeNull();
    expect(redeemed.data?.owner_id ?? redeemed.data?.[0]?.owner_id).toBe(a.id);

    // redeeming again fails (already redeemed)
    expect((await parent.client.rpc("redeem_share_invite", { p_code: invite!.code as string })).error).not.toBeNull();

    // the parent can now read a's checklist, but not a's budget (not granted) or purchases
    expect((await parent.client.from("user_checklist").select("*").eq("user_id", a.id)).data).toHaveLength(1);
    expect((await parent.client.from("budgets").select("*").eq("user_id", a.id)).data).toEqual([]);
    expect((await parent.client.from("purchases").select("*").eq("user_id", a.id)).data).toEqual([]);

    // the unrelated stranger (b) still sees nothing of a's, even though a is now sharing with someone
    expect((await b.client.from("user_checklist").select("*").eq("user_id", a.id)).data).toEqual([]);

    // the parent can log a contribution once budget access is granted; toggle it on directly for this check
    expect((await a.client.from("shared_access").update({ can_view_budget: true }).eq("owner_id", a.id).eq("viewer_id", parent.id)).error).toBeNull();
    const contribution = await parent.client.from("contributions").insert({ owner_id: a.id, contributor_id: parent.id, contributor_name: "Mum", amount: 42 });
    expect(contribution.error).toBeNull();
    expect((await a.client.from("contributions").select("*").eq("owner_id", a.id)).data).toHaveLength(1);
    // but the parent cannot log a contribution against someone who hasn't shared their budget with them
    expect((await parent.client.from("contributions").insert({ owner_id: b.id, contributor_id: parent.id, contributor_name: "Mum", amount: 1 })).error).not.toBeNull();
  });
});

describe.skipIf(enabled)("Supabase RLS isolation", () => {
  it.skip("skipped: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY to run", () => {});
});
