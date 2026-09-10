import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Owner's side: who currently has read access to my checklist/budget. */
export async function GET() {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  try {
    const store = await getStore();
    return Response.json({ shares: await store.listShares(user.id) });
  } catch (err) {
    return handleError("share.access.get", err);
  }
}
