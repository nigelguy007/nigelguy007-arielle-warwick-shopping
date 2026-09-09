# CODEX BUILD HANDOFF
# Arielle's Warwick Move-In Shopping Agent

## Mission

Build a polished, mobile-first web app/PWA that Arielle can use on her phone to prepare for moving into University of Warwick accommodation.

This must not be a static checklist. It should behave like a personal shopping agent that:

- knows the supplied Warwick move-in checklist
- knows what Arielle already owns, has bought, has packed, or should wait to buy
- sources current UK product prices
- compares online and physical-shop options
- uses Arielle's current location, with permission, to find nearby retailers
- shows stores and results on Google Maps
- searches for valid vouchers, retailer promotions and student discounts
- tracks total budget and spend
- avoids recommending items Warwick already provides
- can answer simple natural-language requests such as:
  - "Find me the cheapest duvet that fits my room"
  - "What can I buy near me today?"
  - "I have £150 left. What should I buy next?"
  - "Find a student discount for this"
  - "Show me everything I can get at one shop"
  - "Mark this as bought"
  - "What haven't I packed yet?"

The experience must be simple enough for a 12-year-old to use without instructions.

---

## Existing source files

Use these files if present in the project root or supplied to Codex:

1. `Arielle_Warwick_Shopping_Agent.md`
2. `warwick_move_in_checklist.csv`
3. `warwick_sources.md`
4. Optional original workbook:
   `Arielle_Warwick_Move_In_Checklist.xlsx`

The CSV is the base inventory.

Do not silently throw away source rows. Import all items and map them into the database.

---

# 1. PRODUCT PRINCIPLES

## 1.1 Simplicity

The main screen should answer only four questions:

1. What do I still need?
2. What should I buy next?
3. Where is the best place to buy it?
4. How much money do I have left?

Do not make Arielle manage technical settings.

## 1.2 Mobile first

Design primarily for iPhone.

Target:
- responsive width from 320px upward
- large touch targets
- clear text
- no dense admin-table UI on mobile
- installable PWA
- fast loading
- works reasonably on poor mobile signal

## 1.3 Evidence, not fake certainty

Never invent:
- prices
- stock
- store inventory
- discounts
- voucher validity
- opening hours
- distance
- Warwick room specifications

Every dynamic result must include:
- source
- checked-at timestamp
- whether it is verified or unverified

If a retailer result says "in stock online", do not reinterpret it as "in stock in this physical store".

Google Maps/Places can confirm a store exists and provide location/opening information. It does not by itself prove that a specific product is in stock there.

---

# 2. RECOMMENDED STACK

Use the latest stable versions compatible with each other at build time.

Frontend:
- Next.js with App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui or equivalent accessible component library
- Lucide icons
- PWA manifest + service worker

Hosting:
- Vercel

Backend:
- Next.js server routes / server actions where appropriate

Database and auth:
- Supabase Postgres
- Supabase Auth
- Row Level Security enabled on every user-owned exposed table

AI:
- Vercel AI SDK
- server-side model calls only
- use tool calling for product search, maps search, voucher search, checklist lookup and status updates
- model provider must be configurable through environment variables

Maps:
- Google Maps JavaScript API
- Places API (New)
- Nearby Search / Text Search as appropriate
- optionally Routes API for travel time if enabled

Live product pricing:
MVP provider:
- SerpApi Google Shopping API

Production/affiliate provider:
- Awin product feeds and advertiser programmes where available

Voucher/promotions:
- Awin Offers API when publisher credentials are configured
- retailer promotion pages via supported search provider
- official student-discount sources via deep link or approved partner integrations

Do NOT scrape websites that prohibit automated scraping.

---

# 3. ENVIRONMENT VARIABLES

Create `.env.example`, never commit secrets.

Include:

NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_SERVER_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

AI_GATEWAY_API_KEY=
AI_MODEL=

SERPAPI_API_KEY=

AWIN_PUBLISHER_ID=
AWIN_ACCESS_TOKEN=

Optional:
STUDENT_BEANS_PARTNER_KEY=
UNIDAYS_PARTNER_KEY=

Use the optional student-discount keys only if an approved integration exists.

Never expose:
- Supabase secret/service role keys
- SerpApi keys
- Awin tokens
- AI provider secrets
- server-side Google keys

to browser code.

Restrict Google browser keys by domain and API.

---

# 4. USERS AND ACCESS

This is initially an Arielle-first private app, but design the schema for more users later.

Authentication options:
1. email magic link
2. passkey if straightforward
3. optional "demo/local mode" for development only

For production:
- require sign-in
- create Arielle's profile on first use
- protect all personal checklist/budget data with RLS

Optional second role:
- `parent`
- can contribute budget or view a shared list only if Arielle explicitly shares it

Do not expose Arielle's location history to another user by default.

Do not store precise location history unless needed.

Prefer transient location for nearby search.

---

# 5. ONBOARDING

The first-run flow should be no more than 4 small screens.

## Screen 1: Welcome

Title:
"Let's get you ready for Warwick"

Buttons:
- Start

## Screen 2: Accommodation

Ask:
"Which Warwick accommodation are you staying in?"

Allow:
- search/select residence
- "I don't know yet"

When a residence is selected:
- retrieve/check current official Warwick information
- save hall name
- record bed size if verified
- record bathroom type if verified
- record kitchen/appliances if verified
- record relevant restrictions if verified

Never guess if Warwick data cannot be verified.

## Screen 3: Budget

Ask:
"How much do you want to spend?"

Options:
- £100
- £200
- £300
- £500
- Custom
- Skip

## Screen 4: Location

Explain:
"Share your location and I can find shops near you."

Buttons:
- Use my location
- Use Warwick campus
- Enter a postcode

Default campus fallback:
University of Warwick, Coventry CV4 7AL

Location permission must be opt-in.

---

# 6. CORE NAVIGATION

Bottom navigation on mobile:

1. Home
2. Checklist
3. Shop
4. Map
5. Me

Also include an obvious floating or header action:
"Ask Arielle's Agent"

Do not call it "AI assistant" everywhere. Keep wording human.

---

# 7. HOME SCREEN

Top:
"Hi Arielle 👋"

Show four cards:

### Still needed
Example:
"42 items"

### Bought
Example:
"18 / 60 essentials"

### Packed
Example:
"11 items"

### Budget left
Example:
"£127.45"

Then:

## Buy next

Show the top 3 recommended items based on:
1. Essential priority
2. needed before arrival
3. accommodation compatibility
4. not already owned/bought
5. budget
6. current availability/value

Each product card:
- checklist item
- recommended product
- price
- retailer
- best-value badge if applicable
- Buy online button
- Find nearby button
- Compare button
- Mark bought button

---

# 8. CHECKLIST

Import all rows from `warwick_move_in_checklist.csv`.

Statuses:
- Need
- Already have
- Buy
- Bought
- Packed
- Wait until arrival
- Do not buy

Filters:
- Essentials
- Buy before Warwick
- Take from home
- Wait
- Bought
- Packed
- Category

Each row/item screen should show:
- item name
- category
- quantity
- priority
- original notes
- current status
- recommended timing
- current shortlist if sourced
- price range if known
- vouchers found
- notes

Support swipe/tap actions:
- Have it
- Buy
- Bought
- Packed

---

# 9. WARWICK ACCOMMODATION RULE ENGINE

Create a data model:

`accommodation_profiles`

Fields:
- id
- name
- official_url
- verified_at
- bed_size
- mattress_dimensions
- ensuite
- shared_bathroom
- kitchen_type
- hob_type
- supplied_appliances jsonb
- prohibited_items jsonb
- notes jsonb

When sourcing an item, the agent must first check accommodation constraints.

Examples:

### Bedding
Do not source until bed size is known or clearly label:
"Bed size not confirmed"

### Cookware
If induction:
- only return induction-compatible pans

### Appliances
If kettle/microwave/toaster are supplied:
- mark recommendation as `DO NOT BUY`
- explain "Warwick already provides this"

### Furniture
Default to wait until arrival unless essential.

Create a visible card:
"Warwick already provides"
with supplied items.

---

# 10. LIVE PRODUCT SEARCH

Create a provider interface:

```ts
interface ProductSearchProvider {
  search(input: ProductSearchInput): Promise<ProductSearchResult[]>;
}
```

Input:
- query
- category
- quantity
- user location/postcode
- max price
- retailer preference
- required attributes
- excluded attributes
- onlineOnly
- localPreferred

Result:
- provider
- retailer
- title
- description
- currentPrice
- previousPrice optional
- currency
- deliveryPrice optional
- totalPrice
- rating optional
- reviewCount optional
- imageUrl
- productUrl
- merchantUrl
- availability text
- locationContext
- checkedAt
- sourceConfidence

MVP:
Implement SerpApi Google Shopping provider.

UK search defaults:
- country: UK
- language: en-GB
- localise to Coventry/Warwick or user's selected location

Never cache prices for too long.

Suggested TTL:
- product price: 30-60 minutes
- search result: 30 minutes
- store data: according to Google API policy / sensible cache
- voucher: no longer than source expiry/check requirement

Show:
"Checked 14 minutes ago"

Add manual refresh.

---

# 11. PRODUCT RANKING

Do not simply choose the cheapest result.

Calculate:

`value_score`

Use:
- compatibility
- total price including known delivery
- quality/rating
- quantity/bundle value
- retailer credibility
- delivery speed
- proximity
- voucher applicability
- return convenience

Hard exclusions beat scoring.

Example:
A £5 pan that is not induction-compatible must never outrank a £12 compatible pan.

Return three recommendations:

### Cheapest
Lowest valid total price.

### Best value
Best overall score.

### Nearby
Best practical physical/local option.

If only one or two credible options exist, show fewer rather than inventing three.

---

# 12. GOOGLE MAPS / LOCATION

Build a dedicated Map screen.

Features:
- "Use my location"
- postcode search
- Warwick campus shortcut
- pins for relevant retailers
- list/map toggle

Search nearby places by retailer/category:
- supermarket
- pharmacy
- home goods
- department store
- electronics
- clothing
- shopping centre

For a selected shopping item:
"Where can I get this near me?"

Map cards should show:
- store name
- address
- distance
- current opening status if returned
- rating if returned
- estimated travel time only if Routes API is enabled
- Open in Google Maps
- retailer search button

Do not say an item is stocked at a branch unless verified from a retailer source.

Support:
"Build me a one-shop trip"
and
"Build me the shortest shopping trip"

For route optimisation:
- only implement if Google Routes API credentials are available
- otherwise open a Google Maps multi-stop route externally

---

# 13. VOUCHERS AND DISCOUNTS

Create a provider abstraction:

```ts
interface OfferProvider {
  searchOffers(input: OfferSearchInput): Promise<OfferResult[]>;
}
```

Offer result:
- retailer
- title
- description
- code optional
- type: voucher | promotion | student
- percentage/amount optional
- startDate
- endDate
- terms
- source
- sourceUrl
- checkedAt
- studentVerificationRequired
- verified

## Awin

If `AWIN_PUBLISHER_ID` and `AWIN_ACCESS_TOKEN` exist:
- use Awin Offers API
- fetch promotions/vouchers
- filter by region UK
- filter active dates
- associate offers to merchant/product results

## Student discount sources

Student Beans and UNiDAYS:
- DO NOT bypass student verification
- DO NOT scrape logged-in/private areas
- DO NOT claim a discount is available unless verified
- use official public offer pages or approved partner APIs if credentials are supplied
- otherwise show:
  "Check student discount"
  with an official deep link/search action

Also search public promotions from:
- retailer own offers
- legitimate affiliate/offers providers
- Awin feeds

Discount calculation:
Show both:
- listed price
- estimated price after verified voucher

Never apply incompatible vouchers automatically.

Show terms.

---

# 14. SHOPPING BASKET

Build a basket independent of retailer carts.

Fields:
- item
- chosen product
- retailer
- unit price
- quantity
- delivery
- discount
- estimated total
- purchase status

Group by retailer.

Show:
"3 shops"
"Estimated total £184.72"

Actions:
- Open retailer
- Mark bought
- Remove
- Find cheaper
- Find nearby
- Find voucher

Provide optimisation modes:

### Cheapest
Minimise total purchase cost.

### Best value
Use value score.

### One-shop
Minimise number of retailers.

### Local today
Prioritise nearby/open physical retailers.

### Online only
Ignore physical-store proximity.

### Student deals
Prioritise verified student/promotional savings.

---

# 15. BUDGET

Tables:

`budgets`
- id
- user_id
- name
- amount
- currency
- created_at

`purchases`
- id
- user_id
- checklist_item_id
- product_snapshot jsonb
- retailer
- paid_price
- voucher_used
- purchased_at

Dashboard:
- budget
- committed basket
- actually spent
- remaining

Do not count unverified discounts as guaranteed savings.

Show:
Potential savings
separately from
Confirmed savings

---

# 16. AGENT / CHAT

Create an agent toolset.

Tools:

1. `getChecklist`
2. `getChecklistItem`
3. `updateChecklistStatus`
4. `getAccommodationProfile`
5. `searchProducts`
6. `compareProducts`
7. `searchNearbyStores`
8. `searchOffers`
9. `getBudget`
10. `calculateBasket`
11. `addToBasket`
12. `removeFromBasket`
13. `markPurchased`
14. `getRemainingItems`

System behaviour:

"You are Arielle's Warwick Move-In Shopping Agent. Be practical, concise and protective of her budget. Never invent current prices, stock, discounts, distance, opening hours or Warwick accommodation details. Use tools for dynamic facts. Before recommending bedding, cookware, appliances or furniture, check accommodation constraints. Prefer a simple answer with 1-3 strong choices. Clearly separate online availability from physical-store availability. Never bypass student verification. If data cannot be verified, say so."

Agent examples:

User:
"I've got £80 left, what should I buy?"

Agent:
- checks budget
- checks unbought essentials
- checks hall rules
- searches current prices
- selects highest-priority basket under £80
- returns total and links

User:
"Can I get this nearby?"

Agent:
- asks for location permission only if location is unavailable
- uses nearby stores
- does not claim branch stock without retailer confirmation

User:
"Find me a discount"

Agent:
- checks verified offers
- checks Awin if configured
- checks public student-discount source/deep links
- gives valid dates and terms

---

# 17. DATABASE SCHEMA

Create migrations for:

`profiles`
- id uuid pk references auth.users
- first_name
- university
- accommodation_name
- default_postcode
- created_at
- updated_at

`checklist_items`
- id uuid pk
- source_key unique
- category
- item
- priority
- timing
- default_qty
- notes

`user_checklist`
- id uuid pk
- user_id
- checklist_item_id
- status
- qty
- custom_notes
- updated_at
- unique(user_id, checklist_item_id)

`accommodation_profiles`
as above

`product_search_cache`
- id
- query_hash
- location_key
- provider
- results jsonb
- expires_at

`offers_cache`
- id
- merchant_key
- provider
- results jsonb
- expires_at

`basket_items`
- id
- user_id
- checklist_item_id
- product_snapshot jsonb
- quantity
- added_at

`purchases`
as above

`budgets`
as above

`shared_access`
optional

Enable RLS.

Policies:
- users can only read/write their own `user_checklist`, basket, purchases and budgets
- public/base checklist may be read-only
- accommodation profiles may be read-only for authenticated users
- admin/service operations stay server-side

Add RLS tests.

---

# 18. CSV IMPORT

Create an idempotent seed/import script.

Input:
`warwick_move_in_checklist.csv`

Expected source columns:
- Category
- Item
- Priority
- When
- Qty
- Budget (£)
- Bought?
- Packed?
- Notes

Normalise:
`When` -> `timing`

Do not store Bought/Packed as global checklist defaults.

For first Arielle import:
translate:
- Bought? Yes -> Bought
- Packed? Yes -> Packed
otherwise infer base status from timing:
- Buy before Warwick -> Buy
- Take from home -> Need
- Wait until arrival -> Wait until arrival
- Do not buy yet -> Do not buy

Preserve original notes.

---

# 19. RETAILER STRATEGY

Initial supported retailer labels/search shortcuts should include, where results exist:

- Argos
- Dunelm
- IKEA
- Tesco
- Sainsbury's
- Boots
- Superdrug
- B&M
- Home Bargains
- Primark
- John Lewis
- Amazon UK
- Currys
- local independents

Do not hardcode that all retailers have APIs.

The provider layer should work even when a retailer is only visible through shopping search.

If an official retailer API/feed becomes available later, implement an adapter.

---

# 20. DESIGN DIRECTION

Visual tone:
- modern
- friendly
- clean
- mature enough for a university student
- not childish
- not corporate

Use:
- off-white or very light neutral background
- dark text
- one energetic accent colour
- large rounded cards
- clean product imagery
- simple iconography
- strong spacing

Avoid:
- gradients everywhere
- glassmorphism
- dashboard clutter
- tiny text
- giant data tables on mobile
- chatbot as the entire interface

Suggested home hierarchy:

Arielle 👋
Warwick move-in
[£127 left] [42 still needed]

BUY NEXT
[duvet card]
[towels card]
[extension lead card]

QUICK ACTIONS
[Find near me]
[Best deals]
[Student discounts]
[What haven't I packed?]

---

# 21. PWA

Make it installable on iPhone/Android.

Include:
- manifest
- icons
- theme colour
- standalone display
- offline shell
- cached checklist
- do not show stale product price as live when offline

When offline:
- checklist still works
- bought/packed updates queue locally and sync later if feasible
- product search says:
  "You're offline. Reconnect to check current prices."

---

# 22. PRIVACY

Location:
- request only when needed
- explain why
- no background tracking
- do not create a location-history feature

Personal data:
- minimise collection
- no advertising profiles
- no sale of personal data

Analytics:
- privacy-friendly
- no session replay by default

---

# 23. ERROR STATES

Create human error messages.

Examples:

Product API unavailable:
"I can't check live prices right now. Your checklist is safe. Try the price search again."

No location:
"Share your location or enter a postcode to see nearby shops."

No verified discount:
"I couldn't verify a current discount for this item."

No hall:
"Tell me your Warwick accommodation before I recommend bedding."

---

# 24. DEVELOPMENT MODE / MOCK DATA

The app must run without paid APIs during development.

Create provider modes:

`PRODUCT_PROVIDER=mock|serpapi`
`MAP_PROVIDER=mock|google`
`OFFER_PROVIDER=mock|awin`

Mock data must be visibly marked in development.

Production must refuse to display mock prices as live.

---

# 25. TESTS

Required:

Unit:
- CSV parsing
- budget math
- discount math
- status transitions
- product ranking
- hard compatibility filters
- voucher expiry filtering

Integration:
- product search provider
- location search provider
- offers provider
- RLS user isolation

E2E:
1. sign in
2. complete onboarding
3. view checklist
4. search duvet
5. compare options
6. add product to basket
7. find nearby store
8. mark bought
9. mark packed
10. see budget update

Critical test:
A non-induction pan must never be recommended when hall profile requires induction.

Critical test:
A supplied appliance must not appear in "Buy next".

Critical test:
Expired vouchers must not reduce basket total.

---

# 26. OBSERVABILITY

Add:
- server-side structured logs
- provider latency/error logging
- no secret values in logs
- basic API health endpoint
- error boundary
- graceful provider fallbacks

Track:
- product search success rate
- map lookup success rate
- offer lookup success rate

---

# 27. COST CONTROL

Do not fire live APIs on every render.

Use:
- debounced search
- server-side caching
- explicit refresh
- sensible result limits
- Google Places field masks to request only needed fields
- cache keys that include location/product constraints

Never cache private user data in public caches.

---

# 28. MVP PRIORITY

Build in this order.

## Phase 1
Must work:
- CSV import
- auth
- checklist
- status tracking
- budget
- mobile UI
- PWA

## Phase 2
- live product search
- compare prices
- basket
- source timestamps

## Phase 3
- Google Maps + nearby retailers
- location-aware searches

## Phase 4
- vouchers/promotions via Awin
- student discount deep links/approved integrations

## Phase 5
- conversational shopping agent
- one-shop optimisation
- local-today optimisation
- route optimisation

Do not block Phase 1 because external API keys are missing.

---

# 29. ACCEPTANCE CRITERIA

The build is complete when:

1. Arielle can open the app on iPhone.
2. She can sign in without creating a complex password.
3. Her full checklist is present.
4. She can mark items Have / Buy / Bought / Packed.
5. Her progress persists.
6. She can set a budget.
7. The app shows remaining budget correctly.
8. She can search an item and receive current product results when a live provider is configured.
9. Each result shows retailer, price, source and checked time.
10. She can compare cheapest / best value / nearby.
11. She can grant location permission or use a postcode.
12. Nearby stores appear on Google Maps when configured.
13. Store existence/opening data is never presented as product-stock confirmation.
14. Voucher results show source, expiry and terms.
15. Student discounts never bypass verification.
16. Warwick-supplied items are suppressed from Buy Next.
17. Bedding recommendations respect confirmed bed size.
18. Cookware respects hob compatibility.
19. The app is installable as a PWA.
20. No private API key is exposed to the client bundle.
21. RLS prevents one user from reading another user's private data.
22. The app deploys successfully to Vercel.
23. README contains exact setup steps.
24. `.env.example` contains every required variable.
25. App works in mock mode without paid API credentials.

---

# 30. DELIVERABLES

Codex must produce:

- working application source
- README.md
- `.env.example`
- Supabase migrations
- CSV seed/import script
- mock provider adapters
- SerpApi product adapter
- Google Places/Maps adapter
- Awin offers adapter
- agent/tool definitions
- PWA assets/config
- unit/integration/E2E tests
- Vercel configuration if required
- deployment instructions

Also create:

`HANDOFF.md`

It must state:
- what works
- what is mocked
- what API keys remain
- how to deploy
- how to invite Arielle
- known limitations
- next recommended improvements

---

# 31. CODING INSTRUCTIONS

You are Codex acting as the senior product engineer, AI engineer, UX engineer and QA owner.

Do not just explain how to build this.

BUILD IT.

Start by:
1. inspecting the repository
2. inspecting the supplied checklist/agent/source files
3. choosing the current stable compatible dependency versions
4. writing an implementation plan to `IMPLEMENTATION_PLAN.md`
5. implementing Phase 1 fully
6. continuing through the later phases as credentials permit
7. using mock adapters where credentials are missing
8. running lint, typecheck and tests
9. fixing failures
10. creating the final `HANDOFF.md`

Do not stop after scaffolding.

Do not replace core requirements with TODO comments unless an external credential or contractual API access is genuinely required.

Where a paid/partner API is unavailable:
- implement the provider interface
- implement mock mode
- document exact credential needed
- continue building the rest of the application

Never invent a live API integration.

Make the end result something Nigel can deploy and send to Arielle as a URL.

---

# 32. INITIAL LIVE DATA / PROVIDER NOTES

Use these assumptions only as implementation guidance and verify against current documentation when building:

- Google Places API (New) is the current Google Places web-service generation.
- Nearby Search can use geographic restrictions and distance/popularity ranking.
- Google Places uses field masks; request only what is needed.
- SerpApi exposes Google Shopping search with UK/city localisation.
- Awin exposes publisher offer/promotion/voucher retrieval when appropriate credentials exist.
- Supabase Auth + Postgres RLS should protect each user's private records.
- Student Beans / UNiDAYS must be treated as official/partner integrations or public deep links, not bypassed or scraped.

---

# 33. NICE-TO-HAVE AFTER MVP

If time remains:

- shared parent contribution pot
- price-drop alerts
- voucher-expiry alerts
- "moving day" packing mode
- barcode/photo receipt capture
- receipt total extraction
- purchased-item returns deadline
- favourite retailers
- shopping-route optimisation
- product alternatives based on style/colour
- "one weekend shopping plan"
- export list to WhatsApp
- Apple Wallet-style shopping summary
- dark mode
- accommodation move-in countdown

Do not let these delay the core product.

END OF HANDOFF
