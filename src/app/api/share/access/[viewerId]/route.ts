import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { getStore } from "@/lib/store";

/** Owner revokes a parent's access. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ viewerId: string }> }) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const { viewerId } = await ctx.params;
  try {
    const store = await getStore();
    await store.revokeShare(user.id, viewerId);
    return Response.json({ ok: true });
  } catch (err) {
    return handleError("share.access.delete", err);
  }
}
