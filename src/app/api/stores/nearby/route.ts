import { requireUserOr401 } from "@/lib/auth";
import { badRequest, handleError } from "@/lib/api";
import { nearbyStores } from "@/lib/providers/map";
import { parseLocation } from "@/lib/services/location";
import type { StoreCategory } from "@/lib/providers/map/types";

export const dynamic = "force-dynamic";
const CATEGORIES: StoreCategory[] = ["supermarket", "pharmacy", "home_goods", "department_store", "electronics", "clothing", "shopping_centre"];

export async function GET(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const p = new URL(req.url).searchParams;
  const location = parseLocation({ lat: p.get("lat"), lng: p.get("lng"), source: p.get("source"), label: p.get("label"), postcode: p.get("postcode") });
  if (!location?.coords) return badRequest("Share your location or enter a postcode to see nearby shops.");
  const categories = (p.get("categories") ?? "").split(",").filter((c): c is StoreCategory => (CATEGORIES as string[]).includes(c));
  try {
    const res = await nearbyStores({ center: location.coords, categories: categories.length ? categories : undefined, retailer: p.get("retailer") ?? undefined, radiusMeters: p.get("radius") ? Number(p.get("radius")) : undefined, limit: 20 }, { refresh: p.get("refresh") === "1" });
    return Response.json({ ...res, location, note: "Store existence and opening data only. This does not confirm an item is in stock at this branch." });
  } catch (err) {
    return handleError("stores.nearby", err);
  }
}
