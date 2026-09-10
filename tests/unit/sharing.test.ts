import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalStore } from "@/lib/store/local";
import { generateShareCode } from "@/lib/sharing/code";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "aw-share-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("generateShareCode", () => {
  it("only uses unambiguous characters and defaults to length 8", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateShareCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
    }
  });
});

describe("LocalStore sharing", () => {
  it("creates, lists and revokes invites for the owner", async () => {
    const store = new LocalStore(dir);
    await store.upsertProfile("owner", { firstName: "Arielle" });
    const invite = await store.createInvite("owner", { canViewChecklist: true, canViewBudget: false, expiresInHours: 24 });
    expect(invite.code).toHaveLength(8);
    expect(invite.redeemedAt).toBeNull();

    const listed = await store.listInvites("owner");
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(invite.id);

    await store.revokeInvite("owner", invite.id);
    expect(await store.listInvites("owner")).toEqual([]);
  });

  it("redeems a valid invite into a shared_access-equivalent row with its permissions", async () => {
    const store = new LocalStore(dir);
    await store.upsertProfile("owner", { firstName: "Arielle" });
    const invite = await store.createInvite("owner", { canViewChecklist: true, canViewBudget: false, expiresInHours: 24 });

    const access = await store.redeemInvite("parent", invite.code);
    expect(access.ownerId).toBe("owner");
    expect(access.viewerId).toBe("parent");
    expect(access.canViewChecklist).toBe(true);
    expect(access.canViewBudget).toBe(false);

    expect(await store.listShares("owner")).toHaveLength(1);
    const mine = await store.listSharedWithMe("parent");
    expect(mine).toHaveLength(1);
    expect(mine[0].ownerFirstName).toBe("Arielle");

    // Invite is now spent
    const [reloaded] = await store.listInvites("owner");
    expect(reloaded.redeemedAt).not.toBeNull();
    expect(reloaded.redeemedBy).toBe("parent");
  });

  it("rejects a redeemed or expired code", async () => {
    const store = new LocalStore(dir);
    const invite = await store.createInvite("owner", { canViewChecklist: true, canViewBudget: true, expiresInHours: 24 });
    await store.redeemInvite("parent-1", invite.code);
    await expect(store.redeemInvite("parent-2", invite.code)).rejects.toThrow(/already been used/);

    const expired = await store.createInvite("owner", { canViewChecklist: true, canViewBudget: true, expiresInHours: -1 });
    await expect(store.redeemInvite("parent-3", expired.code)).rejects.toThrow(/invalid or has expired/);

    await expect(store.redeemInvite("parent-4", "NOSUCHCODE")).rejects.toThrow(/invalid or has expired/);
  });

  it("revoking access removes it from both the owner's and viewer's lists", async () => {
    const store = new LocalStore(dir);
    const invite = await store.createInvite("owner", { canViewChecklist: true, canViewBudget: true, expiresInHours: 24 });
    await store.redeemInvite("parent", invite.code);
    expect(await store.listShares("owner")).toHaveLength(1);

    await store.revokeShare("owner", "parent");
    expect(await store.listShares("owner")).toEqual([]);
    expect(await store.listSharedWithMe("parent")).toEqual([]);
  });

  it("tracks contributions to the pot without touching purchases or budget", async () => {
    const store = new LocalStore(dir);
    await store.setBudget("owner", 300);
    const c1 = await store.addContribution("owner", "parent-1", "Mum", { amount: 50, note: "For the duvet", checklistItemId: null });
    const c2 = await store.addContribution("owner", "parent-2", "Dad", { amount: 25, note: "", checklistItemId: null });

    const contributions = await store.listContributions("owner");
    expect(contributions).toHaveLength(2);
    expect(contributions.map((c) => c.id).sort()).toEqual([c1.id, c2.id].sort());
    expect(contributions.reduce((sum, c) => sum + c.amount, 0)).toBe(75);

    // A different owner's pot is isolated
    expect(await store.listContributions("someone-else")).toEqual([]);
    // The budget itself is untouched by contributions
    expect((await store.getBudget("owner"))?.amount).toBe(300);
  });
});
