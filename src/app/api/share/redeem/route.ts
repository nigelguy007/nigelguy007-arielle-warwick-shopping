import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { badRequest, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, z.object({ code: z.string().trim().min(1).max(40) }));
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const access = await store.redeemInvite(user.id, body.code.toUpperCase());
    return Response.json({ access });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "This invite link is invalid or has expired.");
  }
}
