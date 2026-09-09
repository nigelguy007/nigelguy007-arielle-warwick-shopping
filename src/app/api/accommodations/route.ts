import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  try {
    const store = await getStore();
    return Response.json({ accommodations: await store.listAccommodations() });
  } catch (err) {
    return handleError("accommodations", err);
  }
}
