# UniKit — Google Stitch design handoff

A brief for regenerating or extending UniKit's UI in [Google Stitch](https://stitch.withgoogle.com). Stitch takes natural-language prompts (optionally per-screen); paste the relevant section below as the prompt/context for each screen rather than feeding it this whole file at once. This doc describes the *existing, shipped* UI — the design system was originally an "Apple-editorial glass" handoff already implemented in code (`src/app/globals.css`), so treat this as ground truth, not aspiration.

## 1. Product one-liner

**UniKit** — a university move-in shopping assistant (PWA). A student picks their accommodation, gets a personalised checklist of what to buy, compares prices/nearby shops, tracks a budget, and packs for the move — plus an AI agent chat and optional parent/guardian sharing. Mobile-first (iPhone viewport), installable as a home-screen app.

## 2. Visual style in one sentence

iOS-editorial "frosted glass": warm off-white paper background, blurred glass cards/bars floating above it, a single indigo-blue accent, generous rounded corners, SF Pro / system font for body text and a bold geometric display face (Manrope) for headings only. Supports a full dark theme (auto by system preference, overridable).

## 3. Design tokens

### Colour — light theme

| Role | Hex | Usage |
|---|---|---|
| Background | `#f6f3ec` | Page background (warm paper, not pure white) |
| Foreground | `#261d16` | Primary text |
| Foreground secondary | `#63554a` | Subtitles, labels |
| Muted | `#8a7e75` | Placeholder/tertiary text |
| Accent | `#3263c3` | Primary actions, active states, links (indigo-blue) |
| Accent deep | `#1545a2` | Gradient end (FAB), pressed states |
| Accent soft | `#dde8fd` | Accent-tinted chip/badge backgrounds |
| Success | `#10703a` | Connected/positive states |
| Danger | `#bd413f` | Destructive actions, errors |
| Warn | `#ae6800` | Warnings (missing data, expiring) |
| Essential bg / fg | `#e5c379` / `#7a4702` | "Essential item" badge (mustard, not red) |

### Colour — dark theme

| Role | Hex |
|---|---|
| Background | `#080e14` (near-black, cool) |
| Foreground | `#ebeff4` |
| Foreground secondary | `#a4acb4` |
| Muted | `#6b727a` |
| Accent | `#49d9b9` (shifts from blue to teal/mint in dark mode — deliberate, not a bug) |
| Accent deep | `#00ab8e` |
| Accent soft | `#08362e` |

Dark mode is not just a darkened light theme — the accent hue itself rotates from blue to teal for better contrast on near-black. Keep this if Stitch regenerates dark-mode screens.

### Glass / card surfaces

Two frosted-glass surface types, both `backdrop-filter: blur(18–20px) saturate(180%)` over a semi-transparent tint of the surface color, ~0.5px hairline border in a lighter translucent shade, soft drop shadow:
- **`.glass`** — chrome: header icon buttons, search bars, the docked tab bar. Lighter blur.
- **`.glass-card`** — content: product cards, list rows, bottom sheets. `border-radius: 18px` (`--radius-card: 1.125rem`).

Everything floats — there are no hard-edged, opaque white panels anywhere in the UI.

### Typography

- Body/UI text: system font stack (San Francisco on iOS, Segoe/Roboto elsewhere) — *not* a webfont.
- Headings/display only: **Manrope**, weights 700/800, tight tracking (`-0.5px` on H1).
- Page H1 example: 28px, extrabold, `leading-none`.
- Numbers (prices, counts) use tabular figures so columns of digits align.

### Shape & motion

- Corner radius: 18px for cards, full pill (999px) for buttons/chips/tab bar/FAB base.
- The FAB (bottom-right of the tab bar) is a **rounded diamond/squircle**, not a circle — 30px radius on a 60px square, accent gradient fill (`accent` → `accent-deep`, 135°), floating shadow tinted with the accent color.
- Reduced-motion respected (animations collapse to ~0ms).
- Diagonal 45° two-tone stripe pattern is the deliberate placeholder for missing product/store photography (not a broken-image state) — keep this as an illustration style rather than a grey box or icon.

## 4. Navigation / information architecture

Bottom-docked tab bar, 5 tabs, floating pill + separate FAB, both glass:

```
[ Home ]  [ List ]  [ Shop ]  [ Map ]  [ Me ]        ⬥ (FAB → AI agent chat)
```

- **Home** (`/`) — dashboard
- **List** (`/checklist`) — the move-in checklist
- **Shop** (`/shop`) — product search, compare, basket, store connections
- **Map** (`/map`) — nearby stores
- **Me** (`/me`) — profile, budget, sharing, settings
- **FAB** — always visible except in checklist multi-select mode (where the whole dock swaps for a contextual bulk-action bar) — opens **Agent** (`/agent`), a full-screen AI chat, not a 6th tab.

Pre-tab-bar flow: **Onboarding** (7 screens, full-screen, no tab bar) → **Login** (magic-link email) → main app. **Legal terms** (`/legal/terms`) is a public, no-chrome page.

## 5. Screens

Use these as individual Stitch prompts. Each includes purpose, key content, and states.

### 5.1 Onboarding (7 steps, full-screen, no tab bar, progress indicator)
Warm-background full-bleed flow, one question per screen, large friendly type, a single primary CTA pinned to the bottom (safe-area aware):
1. About you — first name, university (autocomplete/free text), year of study, location
2. "Personalised, ready" interstitial — reassurance screen before consent
3. Terms & GDPR consent — plain-language summary + link to `/legal/terms`, explicit accept
4. Accommodation — pick their hall/residence from a searchable list
5. Budget — a single currency input, big and central
6. Move-in date — date picker
7. Location — confirm/opt into device location for nearby-shop features

### 5.2 Home (`/`)
Top bar: hall/university name (small, left) + dark-mode toggle & notification bell (glass icon buttons, right).
Greeting: "Hi {name}" (H1, display font) with university name below.
Countdown banner (glass card): days until move-in, plus any active alert lines (e.g. "2 vouchers expiring") — or, if no move-in date set yet, a CTA card "Set your move-in date →".
Centered **progress ring**: big circular ring, "{n} of {total} sorted" in the center, with three inline stats below it (£ left / to buy / packed) — each stat is tappable and deep-links into a filtered checklist view.
Optional dev-mode banner (accent-soft pill): "Development mode: prices, shops and offers are mock data, not live." — only when non-production mock providers are active; must always be honest about what's live vs. mocked.
"Buy next" section: horizontally scrollable row of product cards (the top few unbought essentials), "All items →" link to checklist.
Below (not shown above but implied by IA): quick actions and a "Warwick already provides" info card.

### 5.3 Checklist / List (`/checklist`)
Full item list grouped by category, each row: item name, category icon, status chip (Need / Already have / Buy / Bought / Packed / Wait until arrival / Do not buy — 7 distinct states, each its own colour/label), essential badge (mustard) where relevant.
Top: search bar (glass) + filter chips (status filters) + sort.
Multi-select mode replaces the bottom tab bar with a bulk-action bar (apply status to N selected items).
Tapping a row opens the item detail page (`/checklist/[id]`) — full description, status actions, and a link into Shop's compare view for that item.

### 5.4 Packing mode (`/checklist/pack`)
A focused, large-touch-target screen for moving-day: items already marked have/bought/packed, grouped by a free-text "box" label the student assigns (e.g. "Box 1 — kitchen"). Each row is a big one-tap "packed" toggle (thumb-friendly, not a small checkbox). Progress bar at the top showing packed/total.

### 5.5 Shop (`/shop`)
Search bar at top. Results as a vertical list of product cards: retailer name/logo initial, product title, price (large, tabular), delivery info, a small "source · checked {time}" line (`SourceLine` component — every price must show provenance), rating/reviews if present.
Sort/filter controls: Cheapest / Best value / Nearby picks tabs; hard compatibility filters applied silently (e.g. hides non-induction items when the hall's hob is induction) rather than shown as broken results.
Tapping "Add" adds to basket (bottom sheet confirmation or toast).
Sub-views reachable from Shop:
- **Compare view** — side-by-side product cards for one checklist item across retailers.
- **Basket** — grouped by retailer, subtotal per retailer, estimated total, "confirmed vs potential savings" summary, optimisation mode picker (6 modes) with a preview-before-apply step.
- **Store connections panel** — a list of retailer rows (Amazon UK, Argos, Dunelm, Tesco, John Lewis + custom add), each row: retailer initial avatar, name, status text, and a Connect/Finish/Connected control. **Must not imply this changes prices or stock** — current copy is deliberately "Saved · doesn't change the prices shown yet" / "Not wired up to live prices or stock yet", surfaced via an expandable row and an authorization bottom sheet listing plain-language facts (no login/payment needed, doesn't change prices, removable anytime). Any Stitch redesign of this screen must preserve that honesty — do not restore copy implying a live price/stock sync unless that functionality is actually built.

### 5.6 Map (`/map`)
Top: category + retailer filter chips, a retailer search field.
Embedded map (when a browser key is configured) with pins for nearby stores + the university campus + the student's device location (opt-in).
Below/instead of the map: a scrollable list of store cards — name, distance, open/closed status, rating, "Open in Google Maps" deep link.
A basket-aware action: "multi-stop trip" button that builds a single Google Maps link visiting every retailer currently in the basket.

### 5.7 Agent (`/agent`)
Full-screen chat, opened via the FAB. Standard chat UI: message bubbles (user right-aligned/accent, assistant left-aligned/glass-card), streaming text, an input bar pinned to the bottom. No tab bar while in this screen (it's a modal-like destination, back returns to wherever the FAB was tapped from).

### 5.8 Me (`/me`)
Profile summary (name, university, hall) at top.
Budget section: set/spent/remaining, editable.
Purchases list with optional receipt photo thumbnail per line.
Notifications section (deep-linked from Home's bell icon).
Dark-mode toggle (also present on Home).
"Share with a parent" section: generate/copy/revoke invite links, list of people with access, and a "Shared with me" list if the student is also a viewer on someone else's plan. A "preview parent view" link lets the owner see their own shared view.

### 5.9 Shared view (`/shared/[ownerId]`) — parent-facing, read-only
Simplified, read-only variant of Home + budget: checklist progress ring, still-needed items list with prices, budget (set/spent/remaining), and a "contribution pot" the parent can log pledges/payments into (amount, optional note, optional linked checklist item). No edit access to the checklist itself.

### 5.10 Login (`/login`)
Minimal, centered, single email input + "Send magic link" button — no password field anywhere in the product.

### 5.11 Legal terms (`/legal/terms`)
Public, plain page, no tab bar/chrome — long-form text content only (operator, contact, data retention, rights). Not a candidate for heavy visual redesign; keep it simple and readable.

### 5.12 Offline (`/offline`)
Shown when the network is unavailable and no cached copy exists for the requested page — friendly "you're offline" message, matches the app's glass-card style rather than a bare browser error page.

## 6. Cross-cutting UI rules Stitch should preserve

1. **Every price/product card shows its source and "checked at" time.** Never design a price as if it were simply true/live — the app distinguishes mock, unverified (aggregator), and verified (retailer feed) data everywhere, usually via a small badge/line, not hidden metadata.
2. **Status is always a labelled chip/badge**, never colour-only (checklist statuses, connection statuses, offer verification) — colourblind-safe by design.
3. **Bottom sheets**, not full-page modals, for short confirmational flows (authorize a store, confirm an action).
4. **Safe-area aware**: bottom-docked elements always add `env(safe-area-inset-bottom)` padding; scrollable content behind the dock gets bottom padding so the tab bar/FAB never occludes it.
5. **Large tap targets** (min 44×44) throughout — this is used one-handed, often while unpacking boxes.
6. Copy tone: plain, honest, slightly warm — never inflate what a mocked or not-yet-built feature does (see §5.5's store-connections note; this is a recurring product principle, not a one-off fix).

## 7. What NOT to change without checking with the app's owner

- The tab set and order (Home/List/Shop/Map/Me + Agent FAB) — deep-linked from multiple places in the codebase.
- The dark-mode accent hue shift (blue → teal) — intentional, not a token typo.
- Any copy describing store connections, mock data, or "unverified" pricing — these map to real functional gaps in the code (see `HANDOFF.md` → "What is mocked") and re-wording them to sound more capable would misrepresent the product.
