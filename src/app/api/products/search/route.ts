import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { compareProducts } from "@/lib/services/compare";
import { parseLocation } from "@/lib/services/location";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const url = new URL(req.url);
  const p = url.searchParams;
  try {
    const result = await compareProducts(user.id, {
      query: p.get("q") ?? undefined,
      itemId: p.get("itemId") ?? undefined,
      location: parseLocation({ lat: p.get("lat"), lng: p.get("lng"), postcode: p.get("postcode"), label: p.get("label"), source: p.get("source") }),
      maxPrice: p.get("maxPrice") ? Number(p.get("maxPrice")) : undefined,
      refresh: p.get("refresh") === "1",
      onlineOnly: p.get("onlineOnly") === "1",
    });
    return Response.json(result);
  } catch (err) {
    return handleError("products.search", err);
  }
}
