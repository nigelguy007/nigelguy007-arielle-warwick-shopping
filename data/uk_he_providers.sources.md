# UK HE providers - source

`uk_he_providers.json` is HESA's own current-provider register, filtered and deduped.

- **Source:** HESA "All HESA providers" tool, enhanced current-providers CSV.
  https://www.hesa.ac.uk/collection/provider-tools/all_hesa_providers
  (direct file: `?ProviderAllCurrentHESA.csv`)
- **Fetched:** 2026-09-15, via Firecrawl (the site's Cloudflare challenge blocks a plain HTTP fetch; a real browser-rendering scrape gets through).
- **Filtering applied:** the raw CSV lists 486 providers including Further Education colleges (`FE_Provider = "Yes"`), which mostly don't run student halls of residence the way universities do. This file keeps only the 323 rows where `FE_Provider` is not `"Yes"` — HESA's "HE provider" category, not a further hand-picked "real university" list. It still includes some entries that are specialist single-subject colleges, NHS trusts running postgraduate training, or administrative/consortium bodies rather than a campus with student accommodation (e.g. "Tavistock and Portman NHS Foundation Trust", "University of London (Institutes and activities)") - HESA's register doesn't itself distinguish these, and this file doesn't editorialize past HESA's own category split.
- **Fields kept:** `ukprn` (UK Provider Reference Number - the stable identifier to key any accommodation data against), `name` (HESA's `ProviderName`), `country` (`E`/`S`/`W`/`N`).
- **Not included from the source:** `INSTID` (a HESA-internal, and not stable across name changes - UKPRN is), `CategoryName` (funding/regulatory category, not location).
- **Not resolved yet:** each provider's actual website URL. HESA's register doesn't carry one; that's step 2 of the accommodation-scraper pipeline (`scripts/scrape-accommodation.ts`), resolved per-university at scrape time via search rather than pre-baked here, since a stale cached URL would silently go wrong on domain changes/rebrands.

Re-fetch periodically (HESA updates this a few times a year) rather than treating this as permanently current - especially the FE_Provider flag and any provider's continued existence (mergers happen: e.g. this fetch already saw some via the full history file).
