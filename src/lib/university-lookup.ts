import "server-only";
import providers from "../../data/uk_he_providers.json";

export interface HeProvider {
  ukprn: string;
  name: string;
  country: string;
}

/** Lowercase, trimmed, "The " prefix stripped, whitespace collapsed - just
 * enough normalisation to match how students actually type a university's
 * name ("University of Warwick") against the official HESA provider name
 * ("The University of Warwick") without doing anything fuzzy that could
 * match the wrong institution. */
function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ");
}

const BY_NORMALIZED_NAME = new Map<string, HeProvider>((providers as HeProvider[]).map((p) => [normalize(p.name), p]));

/**
 * Resolve a student's free-text university name (as typed in onboarding,
 * see Profile.university) to a UKPRN from data/uk_he_providers.json, so it
 * can be matched against accommodation_listings.university_ukprn. Exact
 * (normalized) match only - never a partial/fuzzy one, so a near-miss
 * spelling never silently resolves to a different university's data.
 * Returns null if there's no match.
 */
export function findUkprnForUniversity(universityName: string): string | null {
  if (!universityName.trim()) return null;
  return BY_NORMALIZED_NAME.get(normalize(universityName))?.ukprn ?? null;
}
