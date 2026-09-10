import { describe, expect, it } from "vitest";
import { DeltaStore, emptyDelta, type UserDelta } from "@/lib/store/delta-store";
import { CHUNK_SIZE, MAX_CHUNKS, decodeState, encodeState, readChunks, writeChunks } from "@/lib/store/cookie-codec";
import { loadBaseData } from "@/lib/store/base-data";
import { product } from "./fixtures";

function makeStore(delta: UserDelta = emptyDelta()) {
  const saved: UserDelta[] = [];
  const store = new DeltaStore(loadBaseData(), delta, (d) => saved.push(structuredClone(d)), { firstName: "Arielle" });
  return { store, saved };
}

describe("cookie codec", () => {
  it("round-trips and chunks", () => {
    const state = { hello: "world", n: [1, 2, 3] };
    const encoded = encodeState(state);
    expect(decodeState(encoded)).toEqual(state);
    const jar = new Map<string, string>();
    for (const w of writeChunks("x".repeat(CHUNK_SIZE * 2 + 5))) {
      if (w.remove) jar.delete(w.name);
      else jar.set(w.name, w.value);
    }
    expect(jar.get("aw_demo_n")).toBe("3");
    expect(readChunks((n) => jar.get(n))).toHaveLength(CHUNK_SIZE * 2 + 5);
    expect(readChunks(() => undefined)).toBeNull();
    expect(decodeState("not-valid")).toBeNull();
    expect(() => writeChunks("x".repeat(CHUNK_SIZE * (MAX_CHUNKS + 1)))).toThrow(/too large/);
  });
});

describe("DeltaStore", () => {
  it("serves base data with deterministic ids and persists only the delta", async () => {
    const { store, saved } = makeStore();
    const items = await store.listUserChecklist();
    expect(items).toHaveLength(77);
    const duvet = items.find((i) => i.sourceKey === "bedding/duvet")!;
    expect(duvet.id).toMatch(/^ci_[0-9a-f]{20}$/);
    expect(duvet.status).toBe("buy");
    expect(saved).toHaveLength(0);

    await store.setChecklistStatus("u", duvet.id, "bought");
    await store.setBudget("u", 200);
    await store.upsertProfile("u", { onboardingComplete: true, accommodationSlug: "bluebell" });
    await store.addToBasket("u", product({ id: "p1", description: "x".repeat(500), imageUrl: "https://img" }), 1, duvet.id);
    expect(saved).toHaveLength(4);
    const last = saved.at(-1)!;
    expect(Object.keys(last.statuses)).toEqual([duvet.id]);
    expect(last.basket[0].productSnapshot.imageUrl).toBeNull();
    expect(last.basket[0].productSnapshot.description.length).toBeLessThanOrEqual(80);

    // Rehydrate from the persisted delta as a new request would.
    const { store: again } = makeStore(structuredClone(last));
    expect((await again.getUserChecklistItem("u", duvet.id))?.status).toBe("bought");
    expect((await again.getProfile("u"))?.onboardingComplete).toBe(true);
    expect((await again.getBudget())?.amount).toBe(200);
    expect(await again.listBasket()).toHaveLength(1);
  });

  it("keeps a realistic demo session within the cookie budget", async () => {
    const { store, saved } = makeStore();
    const items = await store.listUserChecklist();
    for (const [i, item] of items.entries()) await store.setChecklistStatus("u", item.id, i % 3 === 0 ? "bought" : i % 3 === 1 ? "packed" : "have");
    for (let i = 0; i < 8; i++) await store.addToBasket("u", product({ id: `p${i}`, title: `Product number ${i} with a fairly long title`, description: "d".repeat(200) }), 1, items[i].id);
    for (let i = 0; i < 6; i++) await store.addPurchase("u", { checklistItemId: items[i].id, productSnapshot: product({ id: `q${i}` }), retailer: "Argos", paidPrice: 9.99, voucherUsed: null });
    await store.setBudget("u", 300);
    await store.upsertProfile("u", { onboardingComplete: true, firstName: "Arielle", accommodationSlug: "rootes", defaultPostcode: "CV4 7AL" });
    const encoded = encodeState(saved.at(-1));
    expect(encoded.length).toBeLessThan(CHUNK_SIZE * MAX_CHUNKS);
    expect(writeChunks(encoded).filter((w) => !w.remove).length).toBeLessThanOrEqual(MAX_CHUNKS + 1);
  });
});
