import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { badRequest, handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// ~2MB image as a base64 data URL (base64 runs about a third bigger than the raw bytes).
const MAX_RECEIPT_CHARS = 2_800_000;

const schema = z.object({
  receiptImage: z
    .string()
    .max(MAX_RECEIPT_CHARS, "That photo is too large - try a smaller image")
    .regex(/^data:image\/[a-z0-9.+-]+;base64,/i, "Expected an image")
    .nullable(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, schema);
  if (body instanceof Response) return body;
  const { id } = await ctx.params;
  try {
    const store = await getStore();
    const purchase = await store.updatePurchase(user.id, id, { receiptImage: body.receiptImage });
    if (!purchase) return badRequest("Purchase not found", 404);
    return Response.json({ purchase });
  } catch (err) {
    return handleError("purchases.patch", err);
  }
}
