import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalStore } from "@/lib/store/local";
import { seedStore } from "@/lib/store/seed";
import { product } from "./fixtures";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "aw-store-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("LocalStore + seed", () => {
  it("imports idempotently and isolates users", async () => {
    const store = new LocalStore(dir);
    const first = await seedStore(store, { userId: "arielle" });
    expect(first.items.inserted).toBeGreaterThan(50);
    const second = await seedStore(store, { userId: "arielle" });
    expect(second.items.inserted).toBe(0);
    expect(second.items.updated).toBe(first.items.inserted);
    expect(second.userStatuses).toBe(0); // existing statuses not overwritten

    const items = await store.listUserChecklist("arielle");
    const duvet = items.find((i) => i.sourceKey === "bedding/duvet")!;
    await store.setChecklistStatus("arielle", duvet.id, "bought");
    expect((await store.getUserChecklistItem("arielle", duvet.id))?.status).toBe("bought");
    expect((await store.getUserChecklistItem("someone-else", duvet.id))?.status).toBe("buy");

    await store.setBudget("arielle", 200);
    expect((await store.getBudget("someone-else"))).toBeNull();
    await store.addToBasket("arielle", product({ id: "x" }), 2, duvet.id);
    expect(await store.listBasket("someone-else")).toEqual([]);
    expect((await store.listBasket("arielle"))[0].quantity).toBe(2);

    // persists to disk
    const reopened = new LocalStore(dir);
    expect((await reopened.getUserChecklistItem("arielle", duvet.id))?.status).toBe("bought");
  });

  it("tracks a price watch per user and lists every profile id for the alerts cron", async () => {
    const store = new LocalStore(dir);
    await store.upsertProfile("arielle", { firstName: "Arielle" });
    await store.upsertProfile("someone-else", {});

    expect(await store.getPriceWatch("arielle", "basket:b1")).toBeNull();
    const first = await store.recordPriceObservation("arielle", "basket:b1", { label: "Kettle", retailer: "Argos", price: 20, currency: "GBP", productUrl: "https://example.com/kettle" });
    expect(first).toMatchObject({ userId: "arielle", itemKey: "basket:b1", lastPrice: 20 });
    expect(await store.getPriceWatch("someone-else", "basket:b1")).toBeNull(); // isolated per user

    const updated = await store.recordPriceObservation("arielle", "basket:b1", { label: "Kettle", retailer: "Argos", price: 15, currency: "GBP", productUrl: "https://example.com/kettle" });
    expect(updated.lastPrice).toBe(15);
    expect((await store.listPriceWatches("arielle"))).toHaveLength(1);

    // persists to disk
    const reopened = new LocalStore(dir);
    expect((await reopened.getPriceWatch("arielle", "basket:b1"))?.lastPrice).toBe(15);

    const ids = await reopened.listProfileUserIds();
    expect(ids).toEqual(expect.arrayContaining(["arielle", "someone-else"]));
  });
});
