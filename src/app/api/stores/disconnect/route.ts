import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const schema = z.object({ retailer: z.string().min(1).max(60) });

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, schema);
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    await store.disconnectStore(user.id, body.retailer);
    return Response.json({ ok: true });
  } catch (err) {
    return handleError("stores.disconnect", err);
  }
}
