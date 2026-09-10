import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  try {
    const store = await getStore();
    const connections = await store.listStoreConnections(user.id);
    return Response.json({ connections });
  } catch (err) {
    return handleError("stores.get", err);
  }
}
