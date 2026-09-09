import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, z.object({ checklistItemId: z.string().nullable().default(null), retailer: z.string().max(80).default(""), paidPrice: z.number().min(0).max(10000), voucherUsed: z.string().max(60).nullable().default(null) }));
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const purchase = await store.addPurchase(user.id, { ...body, productSnapshot: null });
    if (body.checklistItemId) await store.setChecklistStatus(user.id, body.checklistItemId, "bought");
    return Response.json({ purchase }, { status: 201 });
  } catch (err) {
    return handleError("purchases.post", err);
  }
}
