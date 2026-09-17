# Design System: UniKit

> Written for prompting Google Stitch. This encodes an **existing, shipped** design system (see `src/app/globals.css` and `STITCH_HANDOFF.md` in this repo) — it is ground truth, not a fresh creative direction. Where it conflicts with a "generic premium SaaS" default, this document wins.

## 1. Visual Theme & Atmosphere

An iOS-editorial "frosted glass" interface for a university move-in shopping assistant (PWA, mobile-first, used one-handed while unpacking boxes). The atmosphere is warm and calm, not clinical: a paper-toned background with blurred glass surfaces floating above it, a single confident indigo-blue accent, and soft, rounded geometry throughout. Density is **Daily App Balanced (5/10)** — comfortable list rows and cards, never cramped. Variance is **moderate (4/10)** — mostly centered, symmetric layouts (this is a checklist/utility app, not an editorial marketing site) with asymmetric moments only where content demands it (e.g. the horizontally-scrolling "Buy next" row, the off-center progress ring composition). Motion is **Fluid, restrained (3/10)** — subtle transitions on state change, no perpetual decorative animation; `prefers-reduced-motion` collapses all of it to ~0ms.

## 2. Color Palette & Roles

### Light theme
- **Warm Paper** (`#f6f3ec`) — page background. Deliberately off-white/cream, never pure white.
- **Ink** (`#261d16`) — primary text.
- **Ink Secondary** (`#63554a`) — subtitles, secondary labels.
- **Stone Muted** (`#8a7e75`) — placeholder/tertiary text, timestamps.
- **Indigo Accent** (`#3263c3`) — primary actions, active nav state, links, focus.
- **Indigo Deep** (`#1545a2`) — gradient end for the FAB, pressed/active accent states.
- **Indigo Soft** (`#dde8fd`) — accent-tinted chip/badge backgrounds (e.g. dev-mode banner).
- **Success Green** (`#10703a`) — connected/positive states.
- **Danger Red** (`#bd413f`) — destructive actions, errors.
- **Warn Amber** (`#ae6800`) — warnings, missing-data notices, expiring items.
- **Essential Mustard** (bg `#e5c379` / fg `#7a4702`) — the "essential item" badge. Deliberately mustard, not red — red is reserved for danger/errors only.

### Dark theme
- **Near-Black Cool** (`#080e14`) — page background (cool-toned near-black, not `#000000`).
- **Frost White** (`#ebeff4`) — primary text.
- **Frost Secondary** (`#a4acb4`) — subtitles, secondary labels.
- **Slate Muted** (`#6b727a`) — placeholder/tertiary text.
- **Teal Accent** (`#49d9b9`) — primary actions, active nav state. **The accent hue rotates from indigo to teal/mint in dark mode — this is intentional, not a mismatched token.** Do not force the light-mode blue into dark mode.
- **Teal Deep** (`#00ab8e`) — FAB gradient end, pressed states.
- **Teal Soft** (`#08362e`) — accent-tinted chip backgrounds.

**Constraints (both themes):** exactly one accent hue per theme (never mix two accents on screen); no purple, no neon glow, no oversaturated gradient text; status is always red/green/amber *plus* a text label — never colour alone.

## 3. Typography Rules

- **Display/Headings:** **Manrope**, weights 700–800 only, tight tracking (`-0.5px` at the 28px H1 size). Used for headings and section titles only — not body copy. Scale is restrained: one clear H1 per screen (e.g. "Hi {name}"), section titles below it, no competing giant type.
- **Body/UI text:** system font stack (`-apple-system, "SF Pro Text", system-ui, "Segoe UI", Roboto, sans-serif`) — deliberately *not* a second webfont. This keeps the UI feeling native/platform-integrated rather than "designed."
- **Numerals:** tabular figures (`font-variant-numeric: tabular-nums`) for all prices, counts, and countdowns so stacked digits align — this matters in the progress ring, budget stats, and product cards.
- **Banned:** Inter (not used — intentionally on the system stack + Manrope instead), generic default serif fonts (none used anywhere in this product; it has no editorial/long-form serif content).

## 4. Component Stylings

- **Glass chrome (`.glass`)** — header icon buttons, search bars, the docked bottom tab bar. `backdrop-filter: blur(18px) saturate(180%)`, translucent tint of the surface color, ~0.5px hairline border in a lighter translucent shade.
- **Glass cards (`.glass-card`)** — product cards, list rows, bottom sheets, the dashboard's countdown banner. Same blur treatment, `blur(20px)`, 18px corner radius (`--radius-card: 1.125rem`), soft drop shadow tinted toward the background hue (not a generic grey shadow). **Cards are the primary content container in this product — do not replace them with border-dividers for density; the floating-glass read is the core aesthetic, not an elevation choice to economize on.**
- **Buttons:** full-pill shape (`border-radius: 999px`) for primary/secondary actions and the nav bar; accent fill for primary, accent-soft fill for secondary/chip-style actions, ghost/text for tertiary. No outer glow — shadow is soft and tinted, e.g. the FAB's shadow is `0 12px 28px` in the accent color at low opacity, not a hard neon ring.
- **The FAB** (bottom-right of the tab bar, opens the AI agent chat) is a **rounded diamond/squircle**, not a circle — a 60×60px square with 30px corner radius, rotated visual weight, filled with a 135° gradient from Accent → Accent Deep. This is a distinctive, specific shape — do not default it to a plain circular FAB.
- **Status badges:** every status (checklist item status, store-connection status, offer verification) is a small pill with a colour *and* a text label (e.g. "Bought", "Packed", "Unverified") — colour is reinforcement, never the only signal.
- **Provenance line:** every product/price card carries a small secondary-text line naming its source and a "checked at" timestamp (e.g. "SerpApi · checked 2 min ago"). This is a non-negotiable, recurring component — Stitch should treat it as part of every product card's anatomy, not an optional caption.
- **Bottom sheets:** short confirmational flows (authorizing a store connection, confirming a destructive action) use a bottom sheet, never a full-page modal or a centered dialog.
- **Placeholder imagery:** missing product/store photography uses a diagonal 45° two-tone stripe pattern (two closely-related neutral tones from the theme's photo-a/photo-b pair) with a small monospace label — this is a deliberate illustration style, not a broken-image icon or grey box.
- **Loading states:** spinner icon (simple rotating glyph) for short async actions (connecting, saving) — this product does not use skeleton loaders; keep the existing spinner pattern rather than introducing skeletal shimmer.
- **Empty states:** short, warm, specific copy (e.g. "Nothing left to buy before you go.") inside a glass card, not a generic illustrated empty-state graphic.

## 5. Layout Principles

- Single-column, mobile-first at all times — this is a phone-viewport PWA (iPhone-class viewport is the actual target, not a responsive desktop site). There is no desktop layout to design for.
- Content sits in a vertical flex column with consistent horizontal padding (`px-5`); horizontally-scrolling rows (e.g. "Buy next" cards) are the one deliberate exception to single-column, used for browsable card sets.
- Bottom-docked navigation (tab bar + FAB) is fixed and safe-area aware (`env(safe-area-inset-bottom)`); all scrollable content reserves bottom padding (`--dock-h: 5.5rem` + safe area) so the dock never occludes content.
- Top-of-screen content respects the top safe area (`env(safe-area-inset-top)`) for notch/status-bar clearance.
- No horizontal scroll anywhere except the explicitly-designed card carousels.

## 6. Motion & Interaction

- Transitions are subtle and functional: colour/background transitions on theme toggle (~0.2s), state-change transitions on interactive rows — never decorative or perpetual looping motion.
- `prefers-reduced-motion: reduce` must collapse all animation/transition durations to effectively zero — this is enforced today and must be preserved.
- No spring-physics bounce, no staggered cascade reveals, no perpetual shimmer/pulse/float loops. This is a utility app used repeatedly and quickly (often one-handed) — motion should never slow down a repeat visit.
- Tap feedback is a plain, quick state change (colour/opacity), not a translate/scale "push" effect.

## 7. Screen Inventory (for per-screen Stitch prompts)

1. **Onboarding** (7 steps, full-screen, no tab bar): about-you → personalised-ready interstitial → terms/GDPR consent → accommodation picker → budget → move-in date → location.
2. **Home** (`/`): greeting H1, countdown banner, centered progress ring with inline stats (£ left / to buy / packed), "Buy next" horizontal card row.
3. **Checklist** (`/checklist`): search + filter chips, category-grouped rows, 7 distinct status badges (Need / Already have / Buy / Bought / Packed / Wait until arrival / Do not buy), multi-select mode swaps the bottom dock for a bulk-action bar.
4. **Packing mode** (`/checklist/pack`): items grouped by free-text "box" label, large one-tap packed toggle (thumb-sized, not a checkbox), progress bar.
5. **Shop** (`/shop`): search bar, sort tabs (Cheapest / Best value / Nearby), product cards with provenance line; sub-views: compare (side-by-side cards for one item), basket (grouped by retailer, optimisation modes), store-connections panel (must read as "saved, not live" — see cross-cutting rules).
6. **Map** (`/map`): filter chips, embedded map with pins, store cards (distance/open-closed/rating), multi-stop trip link.
7. **Agent** (`/agent`): full-screen chat, opened via the FAB, standard bubble layout, streaming text, bottom input bar.
8. **Me** (`/me`): profile summary, budget (set/spent/remaining), purchases with optional receipt thumbnail, notifications, dark-mode toggle, parent-sharing management.
9. **Shared view** (`/shared/[ownerId]`): read-only parent-facing variant of Home + budget + a "contribution pot."
10. **Login**: single centered email input, magic-link only — no password field anywhere in the product.
11. **Legal terms** (`/legal/terms`): plain long-form text page, no chrome, not a redesign target.

## 8. Cross-Cutting Content Rules (non-negotiable)

- **Every price/product card shows its source and "checked at" time.** Never render a price as if it were simply, unconditionally live.
- **Status is always a labelled badge**, never colour-only.
- **Store connections must never imply a live price/stock sync that doesn't exist.** Current, correct copy: "Saved · doesn't change the prices shown yet" / "Not wired up to live prices or stock yet." If Stitch (or anyone) regenerates this screen, it must preserve this honesty constraint — do not restore language like "Connected · prices sync automatically."
- **Copy tone:** plain, honest, slightly warm. Never inflate what a mocked or unbuilt feature does — this is a recurring product principle, not a one-off fix.
- **Bottom sheets, not modals**, for short confirmations.
- **44px minimum tap targets** throughout — used one-handed, often mid-unpacking.

## 9. Anti-Patterns (Banned for this project)

- No emojis in UI copy.
- No Inter font, no generic default serif fonts.
- No pure black (`#000000`) — dark background is `#080e14`.
- No purple or neon-glow accents; no more than one accent hue per theme.
- No perpetual/looping decorative animation (violates the motion-restraint rule above and `prefers-reduced-motion`).
- No skeleton/shimmer loaders — use the existing spinner pattern.
- No centered marketing-style hero sections — this is a utility dashboard, not a landing page.
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen") in UI copy.
- No implying a mocked/unbuilt feature (store connections, live price sync) is real or automatic.
- No replacing the frosted-glass card system with flat border-dividers "for density" — glass cards are the core aesthetic, not a stylistic default to economize away.
