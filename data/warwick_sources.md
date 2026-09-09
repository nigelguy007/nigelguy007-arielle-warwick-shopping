# Warwick accommodation sources

The app never guesses room specifications. Each accommodation profile carries an
`official_url` and a `verified_at` timestamp. Fields are only populated when they
have been checked against the official page listed here.

| Residence | Official page |
|---|---|
| All on-campus residences (index) | https://warwick.ac.uk/services/accommodation/students/campus/ |
| Arthur Vick | https://warwick.ac.uk/services/accommodation/students/campus/arthurvick/ |
| Benefactors | https://warwick.ac.uk/services/accommodation/students/campus/benefactors/ |
| Bluebell | https://warwick.ac.uk/services/accommodation/students/campus/bluebell/ |
| Claycroft | https://warwick.ac.uk/services/accommodation/students/campus/claycroft/ |
| Cryfield | https://warwick.ac.uk/services/accommodation/students/campus/cryfield/ |
| Heronbank | https://warwick.ac.uk/services/accommodation/students/campus/heronbank/ |
| Jack Martin | https://warwick.ac.uk/services/accommodation/students/campus/jackmartin/ |
| Lakeside | https://warwick.ac.uk/services/accommodation/students/campus/lakeside/ |
| Rootes | https://warwick.ac.uk/services/accommodation/students/campus/rootes/ |
| Sherbourne | https://warwick.ac.uk/services/accommodation/students/campus/sherbourne/ |
| Tocil | https://warwick.ac.uk/services/accommodation/students/campus/tocil/ |
| Westwood | https://warwick.ac.uk/services/accommodation/students/campus/westwood/ |
| Whitefields | https://warwick.ac.uk/services/accommodation/students/campus/whitefields/ |
| What to bring (official) | https://warwick.ac.uk/services/accommodation/students/campus/whattobring/ |

Campus fallback location: University of Warwick, Coventry CV4 7AL.

## How to verify a residence

1. Open the official page for the residence.
2. Fill `bed_size`, `mattress_dimensions`, `ensuite`, `kitchen_type`, `hob_type`,
   `supplied_appliances` and `prohibited_items` in `data/accommodations.json`.
3. Set `verified_at` to the ISO date you checked it.
4. Re-run `pnpm import:checklist` (local mode) or apply the seed SQL (Supabase).

Until a field is verified the app shows "Not confirmed" and refuses to make
bedding or cookware recommendations that depend on it.
