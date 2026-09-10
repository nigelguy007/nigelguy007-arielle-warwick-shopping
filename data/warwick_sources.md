# Warwick accommodation sources

The app never guesses room specifications. Each accommodation profile carries an
`official_url` and a `verified_at` timestamp. Fields are only populated when they
have been checked against an official page listed here.

Verified 2026-09-10. Warwick restructured its accommodation site since this file was
first written - the original `/services/accommodation/students/campus/<slug>/` URLs
all now 404. Current pages live under `/services/accommodation/students/residences/<slug>/`
(Whitefields is the one exception, still at `/services/accommodation/students/whitefields/`,
a 2023-dated page - re-check it first if anything looks stale).

| Residence | Official page |
|---|---|
| Campus residences (index, JS-driven filter - no per-hall links to scrape) | https://warwick.ac.uk/services/accommodation/students/residences/ |
| Arthur Vick | https://warwick.ac.uk/services/accommodation/students/residences/arthur-vick/ |
| Benefactors | https://warwick.ac.uk/services/accommodation/students/residences/benefactors/ |
| Bluebell | https://warwick.ac.uk/services/accommodation/students/residences/bluebell/ |
| Claycroft | https://warwick.ac.uk/services/accommodation/students/residences/claycroft/ |
| Cryfield Standard | https://warwick.ac.uk/services/accommodation/students/residences/cryfield-standard/ |
| Cryfield Townhouses | https://warwick.ac.uk/services/accommodation/students/residences/cryfield-townhouses-12-bed/ |
| Heronbank | https://warwick.ac.uk/services/accommodation/students/residences/heronbank/ |
| Jack Martin | https://warwick.ac.uk/services/accommodation/students/residences/jack-martin/ |
| Lakeside | https://warwick.ac.uk/services/accommodation/students/residences/lakeside/ |
| Rootes | https://warwick.ac.uk/services/accommodation/students/residences/rootes/ |
| Sherbourne | https://warwick.ac.uk/services/accommodation/students/residences/sherbourne/ |
| Tocil | https://warwick.ac.uk/services/accommodation/students/residences/tocil/ |
| Westwood En Suite | https://warwick.ac.uk/services/accommodation/students/residences/westwood-en-suite/ |
| Whitefields | https://warwick.ac.uk/services/accommodation/students/whitefields/ |
| Prohibited items in halls (campus-wide, not per-hall) | https://warwick.ac.uk/services/accommodation/students/usefulinfo/induction/lifeinhalls/restrictions |

Campus fallback location: University of Warwick, Coventry CV4 7AL.

## Known gaps (deliberately left `null` - do not guess)

- **Claycroft `hob_type`**: the official page hedges with "the majority of kitchens
  have induction hobs" - not confirmed for every kitchen in the hall, so left `null`.
- **Whitefields `hob_type`**: the page lists "Cooker, fridge and freezer" but never
  names the hob technology.
- **Cryfield, Benefactors, Westwood `bed_size`/`mattress_dimensions`**: each of these
  three covers more than one room type with a *different* bed size (e.g. Cryfield
  Standard = single, Cryfield Townhouses = small double), but the schema models one
  bed size per hall slug. Picking one would silently misinform residents of the other
  room type, so both fields are left `null` and the per-room-type breakdown is recorded
  in that hall's `notes` instead.

## How to verify a residence

1. Open the official page for the residence (see table above; search
   `site:warwick.ac.uk "<hall name>"` if a URL 404s - Warwick reorganises this
   section periodically).
2. Fill `bed_size`, `mattress_dimensions`, `ensuite`, `kitchen_type`, `hob_type`,
   `supplied_appliances` and `prohibited_items` in `data/accommodations.json`.
   Only fill a field when the page states it for *every* room/kitchen in that hall -
   if it varies by room type and the hall has one slug, leave it `null` and note the
   breakdown instead (see "Known gaps" above).
3. Set `verified_at` to the ISO timestamp you checked it.
4. Re-run `pnpm import:checklist` (local mode) or apply the seed SQL (Supabase).

Until a field is verified the app shows "Not confirmed" and refuses to make
bedding or cookware recommendations that depend on it.
