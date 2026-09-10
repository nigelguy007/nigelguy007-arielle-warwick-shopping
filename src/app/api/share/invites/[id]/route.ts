import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { getStore } from "@/lib/store";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  try {
    const store = await getStore();
    await store.revokeInvite(user.id, id);
    return Response.json({ ok: true });
  } catch (err) {
    return handleError("share.invites.delete", err);
  }
}
