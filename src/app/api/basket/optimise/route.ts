import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { compareProducts } from "@/lib/services/compare";
import { optimiseBasket, type Alternative, type OptimiseMode } from "@/lib/services/basket-optimise";
import { parseLocation } from "@/lib/services/location";
import { WARWICK_CAMPUS } from "@/lib/types";

export const dynamic = "force-dynamic";
const MODES: OptimiseMode[] = ["cheapest", "best_value", "one_shop", "local_today", "online_only", "student_deals"];

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, z.object({ mode: z.enum(MODES), location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional(), source: z.string().optional(), postcode: z.string().nullable().optional() }).nullable().optional(), apply: z.boolean().default(false) }));
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const basket = await store.listBasket(user.id);
    const location = body.location ? parseLocation(body.location) : WARWICK_CAMPUS;
    const alternatives: Alternative[] = [];
    let offers: Awaited<ReturnType<typeof compareProducts>>["offers"] = [];
    let stores: Awaited<ReturnType<typeof compareProducts>>["stores"] = [];
    for (const line of basket) {
      const cmp = await compareProducts(user.id, { itemId: line.checklistItemId ?? undefined, query: line.checklistItemId ? undefined : line.productSnapshot.title, location, onlineOnly: body.mode === "online_only" });
      alternatives.push({ basketItemId: line.id, candidates: cmp.recommendations.all.map((c) => ({ product: c.product, score: c.score })) });
      offers = [...offers, ...cmp.offers];
      if (cmp.stores.length) stores = cmp.stores;
    }
    const optimised = optimiseBasket(basket, alternatives, body.mode, { offers, stores });
    if (body.apply) {
      for (const line of optimised.items) {
        const original = basket.find((b) => b.id === line.id);
        if (original && original.productSnapshot.id !== line.productSnapshot.id) {
          await store.removeFromBasket(user.id, line.id);
          await store.addToBasket(user.id, line.productSnapshot, line.quantity, line.checklistItemId);
        }
      }
    }
    return Response.json(optimised);
  } catch (err) {
    return handleError("basket.optimise", err);
  }
}
