import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { badRequest, handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { canTransition } from "@/lib/checklist/status";
import { CHECKLIST_STATUSES } from "@/lib/types";

const schema = z.object({
  status: z.enum(CHECKLIST_STATUSES),
  qty: z.number().int().min(1).max(99).optional(),
  customNotes: z.string().max(500).optional(),
  box: z.string().max(60).optional(),
  paidPrice: z.number().min(0).max(10000).optional(),
  retailer: z.string().max(80).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, schema);
  if (body instanceof Response) return body;
  const { id } = await ctx.params;
  try {
    const store = await getStore();
    const current = await store.getUserChecklistItem(user.id, id);
    if (!current) return badRequest("Item not found", 404);
    if (!canTransition(current.status, body.status)) return badRequest(`Can't move from ${current.status} to ${body.status}`);
    const entry = await store.setChecklistStatus(user.id, id, body.status, { qty: body.qty, customNotes: body.customNotes, box: body.box });
    if (body.status === "bought" && current.status !== "bought" && current.status !== "packed" && typeof body.paidPrice === "number") {
      await store.addPurchase(user.id, { checklistItemId: id, productSnapshot: null, retailer: body.retailer ?? "", paidPrice: body.paidPrice, voucherUsed: null });
    }
    return Response.json({ entry });
  } catch (err) {
    return handleError("checklist.patch", err);
  }
}
