import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { badRequest, handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  try {
    const store = await getStore();
    await store.removeFromBasket(user.id, id);
    return Response.json({ ok: true });
  } catch (err) {
    return handleError("basket.delete", err);
  }
}

/** Mark a basket line as bought: records a purchase, updates the checklist, removes the line. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const body = await parseJson(req, z.object({ paidPrice: z.number().min(0).optional(), voucherUsed: z.string().nullable().optional() }));
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const line = (await store.listBasket(user.id)).find((b) => b.id === id);
    if (!line) return badRequest("Basket item not found", 404);
    const paid = body.paidPrice ?? line.productSnapshot.totalPrice * line.quantity;
    const purchase = await store.addPurchase(user.id, { checklistItemId: line.checklistItemId, productSnapshot: line.productSnapshot, retailer: line.productSnapshot.retailer, paidPrice: Math.round(paid * 100) / 100, voucherUsed: body.voucherUsed ?? null });
    if (line.checklistItemId) await store.setChecklistStatus(user.id, line.checklistItemId, "bought");
    await store.removeFromBasket(user.id, id);
    return Response.json({ purchase });
  } catch (err) {
    return handleError("basket.buy", err);
  }
}
