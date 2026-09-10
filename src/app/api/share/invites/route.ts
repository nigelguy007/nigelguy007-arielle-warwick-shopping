import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function withUrl(invite: { code: string }) {
  return { ...invite, url: `${env.appUrl}/share/${invite.code}` };
}

export async function GET() {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  try {
    const store = await getStore();
    const invites = await store.listInvites(user.id);
    return Response.json({ invites: invites.map(withUrl) });
  } catch (err) {
    return handleError("share.invites.get", err);
  }
}

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, z.object({ canViewChecklist: z.boolean().default(true), canViewBudget: z.boolean().default(true), expiresInHours: z.number().min(1).max(24 * 30).default(24 * 14) }));
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const invite = await store.createInvite(user.id, body);
    return Response.json({ invite: withUrl(invite) }, { status: 201 });
  } catch (err) {
    return handleError("share.invites.post", err);
  }
}
