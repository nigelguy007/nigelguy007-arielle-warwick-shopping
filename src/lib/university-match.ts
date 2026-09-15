// Framework/runtime-free (no "server-only", no JSON import) so it's safe to
// use from client components too, e.g. deciding which accommodation-picker
// UI to show while the student is still typing. Kept in normalized sync
// with the matching in university-lookup.ts's findUkprnForUniversity.

function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ");
}

/** True if `universityName` is some reasonable spelling of "University of
 * Warwick". Used to decide whether to keep using Warwick's existing
 * hand-verified accommodation_profiles data (see AccommodationProfile)
 * rather than the newer per-university accommodation_listings dataset. */
export function isWarwickUniversityName(universityName: string): boolean {
  return normalize(universityName) === "university of warwick";
}
