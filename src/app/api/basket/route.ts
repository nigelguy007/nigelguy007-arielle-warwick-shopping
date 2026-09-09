import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { loadDashboard } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

const productSchema = z.object({
  id: z.string(),
  provider: z.string(),
  retailer: z.string(),
  title: z.string(),
  description: z.string().default(""),
  currentPrice: z.number().min(0),
  previousPrice: z.number().optional(),
  currency: z.string().default("GBP"),
  deliveryPrice: z.number().optional(),
  totalPrice: z.number().min(0),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  imageUrl: z.string().nullable().default(null),
  productUrl: z.string(),
  merchantUrl: z.string().nullable().default(null),
  availability: z.string().default(""),
  attributes: z.array(z.string()).default([]),
  locationContext: z.string().default(""),
  checkedAt: z.string(),
  sourceConfidence: z.enum(["verified", "unverified", "mock"]),
  deliveryDays: z.number().optional(),
  nearbyStoreId: z.string().optional(),
});

export async function GET() {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  try {
    const d = await loadDashboard(user.id);
    return Response.json({ basket: d.basket, totals: d.basketTotals, budget: d.budgetSummary });
  } catch (err) {
    return handleError("basket.get", err);
  }
}

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, z.object({ product: productSchema, quantity: z.number().int().min(1).max(20).default(1), checklistItemId: z.string().nullable().default(null) }));
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const item = await store.addToBasket(user.id, body.product, body.quantity, body.checklistItemId);
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    return handleError("basket.post", err);
  }
}
