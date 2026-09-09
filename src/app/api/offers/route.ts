import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { searchOffers } from "@/lib/providers/offer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const p = new URL(req.url).searchParams;
  try {
    const res = await searchOffers({ retailer: p.get("retailer") ?? undefined, query: p.get("q") ?? undefined }, { refresh: p.get("refresh") === "1" });
    const verified = res.offers.filter((o) => o.verified);
    return Response.json({ ...res, message: verified.length === 0 ? "I couldn't verify a current discount for this item." : null });
  } catch (err) {
    return handleError("offers", err);
  }
}
