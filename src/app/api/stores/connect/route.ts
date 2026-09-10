import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const schema = z.object({ retailer: z.string().min(1).max(60) });

/** Only called once the student has actually tapped "Allow" on the
 * authorization sheet - nothing is persisted before that. A short delay
 * matches the handoff's "Connecting…" moment; there is no real OAuth/MCP
 * handshake behind it yet (see HANDOFF.md). */
export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, schema);
  if (body instanceof Response) return body;
  try {
    await new Promise((r) => setTimeout(r, 700));
    const store = await getStore();
    const connection = await store.connectStore(user.id, body.retailer);
    return Response.json({ connection });
  } catch (err) {
    return handleError("stores.connect", err);
  }
}
