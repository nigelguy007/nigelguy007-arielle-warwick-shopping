import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Real per-university accommodation listings (see
 * supabase/migrations/0007_accommodation_listings.sql), for the
 * onboarding accommodation picker. `university` is free text as typed by
 * the student - matched against data/uk_he_providers.json server-side (see
 * DataStore.listAccommodationListings). Always returns [] rather than any
 * other university's data when there's no match or nothing scraped yet.
 */
export async function GET(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const university = new URL(req.url).searchParams.get("university")?.trim() ?? "";
  try {
    const store = await getStore();
    const listings = university ? await store.listAccommodationListings(university) : [];
    return Response.json({ listings });
  } catch (err) {
    return handleError("accommodations.listings", err);
  }
}
