import { requireUserOr401 } from "@/lib/auth";
import { badRequest, handleError } from "@/lib/api";
import { geocodePostcode } from "@/lib/providers/map";
import { isValidUkPostcode } from "@/lib/services/location";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const postcode = (new URL(req.url).searchParams.get("postcode") ?? "").trim();
  if (!isValidUkPostcode(postcode)) return badRequest("That doesn't look like a UK postcode.");
  try {
    const hit = await geocodePostcode(postcode);
    if (!hit) return badRequest("I couldn't find that postcode.", 404);
    return Response.json({ location: { label: hit.label, source: "postcode", coords: hit.coords, postcode: postcode.toUpperCase() } });
  } catch (err) {
    return handleError("geocode", err);
  }
}
