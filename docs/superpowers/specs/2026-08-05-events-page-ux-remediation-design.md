# Events Page UX Remediation — Design

**Date:** 2026-08-05
**Source:** QA review, "Lyante Events UX Feedback" (7 findings + a brand note)
**Scope:** `/events` public listing page only. No brand token, font, or palette changes.

---

## 1. Problem

QA reviewed the public events listing and filed seven findings. Each traces to a
specific cause in the current code:

| # | Finding | Severity | Cause |
|---|---------|----------|-------|
| 1 | Large empty space | High | `GRID` is `lg:grid-cols-4` (`page.tsx:61`); one upcoming event renders at ¼ of the 1280px container |
| 2 | Event cards too small | High | Same grid, plus `aspect-[3/2]` artwork on a ~295px card |
| 3 | No call-to-action on cards | High | `EventCard` renders no action element |
| 4 | Upcoming event doesn't stand out | Medium | `UpcomingCard` and `PastCard` both render `EventCard` at identical size |
| 5 | Completed events look disabled | Medium | `inactive` applies `grayscale`, `opacity-70`, `cursor-not-allowed`, a `bg-gray-300/20` overlay, and drops the `<Link>` (`EventCard.tsx:53, 98, 127-133`) |
| 6 | Information hard to scan | Medium | Title at 16/18px; date and venue both 11px `text-ash` in one row — no tier separation |
| 7 | No filter option | Medium | Page is three hardcoded stacked `<section>`s with no filter UI |

QA's screenshots show only two sections (Upcoming, Completed). The page actually
renders three — Upcoming, Past Events, Completed — because `PUBLISHED` events
whose date has elapsed fall into a separate bucket from admin-marked `COMPLETED`
ones. The redesign keeps all three buckets but surfaces them as filters.

### Out of scope

QA's closing note asks whether fonts and colours could change "throughout the
website." Bebas Neue, DM Sans, and the gold/ivory/ash palette are brand tokens in
`src/app/globals.css` consumed by marketing, dashboard, client, and the `amit`
satellite site. Changing them is a brand decision with a blast radius far beyond
this page. **Decision: not addressed here.** Recorded as an open question in §7.
All seven findings are resolved within the existing tokens.

---

## 2. Architecture

The page stays a server component. It fetches, computes availability, and hands a
plain-JSON array to one client component that owns nothing but filter state.

```
page.tsx (server)
  getCachedEvents() + prisma.ticket.groupBy()
  → computeEventAvailability() per event
  → EventCardData[]
      │
      └─ EventsBrowser.tsx  ('use client')  — filter chips + grid
           ├─ FeaturedEvent.tsx  — soonest LIVE event, full-width
           └─ EventCard.tsx      — reworked grid card
```

Files:

| File | Change |
|------|--------|
| `src/app/(public)/events/page.tsx` | Rewrite body; drop `UpcomingCard`/`PastCard`/`GRID` |
| `src/components/events/EventsBrowser.tsx` | **New** — client, filter state + layout |
| `src/components/events/FeaturedEvent.tsx` | **New** — server-safe presentational |
| `src/components/events/EventCard.tsx` | Rework — sizing, CTAs, hierarchy, status badges |

`EventCard` has exactly one consumer today (`page.tsx`), so its prop contract can
change freely.

### 2.1 Data contract

`EventCardData` is exported from `EventCard.tsx` — the card owns its own contract.
It must be JSON-serializable to cross the server/client boundary: dates are ISO
strings, no `Date` objects.

```ts
export type EventCardBucket = 'upcoming' | 'past' | 'completed'

export interface EventCardData {
  id: string
  title: string
  image: string
  artistImage: string
  venue?: string
  date: string          // ISO
  eventType?: string
  badges: EventSaleBadge[]
  bucket: EventCardBucket
  isPurchasable: boolean
  soldOut: boolean
}
```

### 2.2 Bucketing

Buckets derive from `computeEventAvailability().lifecycle`, the existing single
source of truth. Landmine #5 in `ARCHITECTURE.md` forbids inlining availability
checks in components — and `page.tsx:82-89` currently violates the spirit of it by
re-deriving "ended" with its own `new Date(e.date).getTime() >= now`. That
duplication is removed as part of this work.

| Bucket | Rule |
|--------|------|
| `upcoming` | `status === 'PUBLISHED'` and `lifecycle === 'LIVE'` |
| `past` | `status === 'PUBLISHED'` and `lifecycle === 'ENDED'` |
| `completed` | `lifecycle === 'COMPLETED'` |

Anything else (`DRAFT`, `CANCELLED`) stays off the public listing, as today.

---

## 3. Card redesign — findings 2, 3, 5, 6

### 3.1 Size (finding 2)

- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, gap `6` / `md:8`.
  At the 1280px container this yields ~400px cards, up from ~295px.
- Artwork aspect ratio: `3/2` → `4/3`, roughly doubling poster area.
- `sizes` attribute updated to match the new column count so Next.js requests
  appropriately sized images: `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw`.

### 3.2 Call-to-action (finding 3)

Two genuine actions per card. Nested anchors are invalid HTML and break keyboard
navigation, so this uses the card-overlay link pattern:

- The **title** carries a `<Link href="/events/{id}">` with
  `after:absolute after:inset-0`, making the whole card surface clickable through
  a single accessible link with the event title as its name.
- **Buy Tickets** is a separate `<Link href="/booking/{id}/checkout">` positioned
  `relative z-10` so it sits above the overlay.
- A visible `View Details →` affordance is rendered as a non-interactive `<span>`;
  the title's overlay link already handles the click.

Linking straight to `/booking/{id}/checkout` is safe: that route gates itself for
unauthenticated visitors, which is exactly why `CheckoutButton.tsx:28-34` is
allowed to push to it directly without checking a session first.

When `isPurchasable` is false, Buy Tickets is replaced by a muted status line and
only View Details remains. The label is resolved in this order:

1. `soldOut` → `Sold Out`
2. `bucket === 'completed'` → `Completed`
3. otherwise → `Sales Closed`

### 3.3 Completed and past styling (finding 5)

Removed: `grayscale`, `opacity-70`, `cursor-not-allowed`, the `bg-gray-300/20`
overlay, and the non-`<Link>` branch at `EventCard.tsx:127-133`.

Past and completed events keep full-colour artwork and become clickable.
`/events/[id]` already handles them correctly — it fetches by id regardless of
status and disables purchase through `purchaseBlockedReason()`, which returns
`'This event has concluded'` for `COMPLETED` and `'Ticket sales have closed'` for
elapsed events.

Status is carried by a corner badge instead of desaturation:

| Bucket | Badge | Style |
|--------|-------|-------|
| `completed` | `Completed` | gold outline on `lyante-bg/85` |
| `past` | `Ended` | `coal/85` on ivory |
| `upcoming` | event type + up to 2 sale badges | unchanged from today |

**This is a behaviour change:** past events were deliberately non-clickable and
are now navigable. Approved as part of resolving finding 5, whose stated intent is
"still encouraging users to view event details or past information."

### 3.4 Hierarchy (finding 6)

Three visually distinct tiers replace the current flat 11px row. Separation comes
from size, colour, and line breaks — all within existing tokens.

| Tier | Treatment |
|------|-----------|
| Title | `font-bebas text-2xl md:text-[28px]` `text-ivory`, uppercase, `line-clamp-2` |
| Date | own line, `font-dm-sans text-sm font-medium tracking-wide` `text-gold` |
| Venue | own line below, `text-[13px]` `text-ash`, truncated |

`line-clamp-1` on the title becomes `line-clamp-2` — the wider card makes
one-line truncation of long festival names unnecessary.

---

## 4. Layout — findings 1, 4, 7

### 4.1 Featured event (findings 4, 1)

The soonest `upcoming` event renders as a full-width split panel above the grid:

- Artwork left (~55% at `md`+), content right; stacks vertically below `md`.
- Content: `Next Show` eyebrow in `section-label`, title at
  `clamp(40px, 5vw, 72px)` in `font-bebas`, date and venue, sale badges, and both
  CTAs (`Buy Tickets` solid gold, `View Details` outlined).
- `min-h-[420px]` at `md`+.
- Rendered only when the `upcoming` bucket is non-empty, and only when the active
  filter is `all` or `upcoming`.
- **Excluded from the grid below** so it never appears twice.

This is the actual fix for finding 1. QA's screenshot showed one upcoming event
occupying a quarter-width cell with three empty cells beside it; that event now
spans the viewport.

### 4.2 Filter bar (finding 7)

`EventsBrowser` renders chips: `All`, `Upcoming`, `Past`, `Completed`, each with a
count.

- Chips for empty buckets are not rendered.
- The entire bar is hidden when fewer than two buckets are non-empty, so a
  single-event site gets no filter UI it cannot use.
- Default selection: `upcoming` when non-empty, otherwise `all`.
- State is plain `useState`. Not URL-synced — no shareable-filter-link requirement
  exists, and `useSearchParams` would force a Suspense boundary for marginal gain.
- Chips are `<button>` elements in a `role="tablist"`-free group with
  `aria-pressed` reflecting selection.

The three stacked `<section>` headings collapse into a single masthead
(`LYANTE PRESENTS` / `UPCOMING SHOWS`, kept from the current design) plus the
filter bar.

### 4.3 Empty states

- No events at all: existing `stateScreen('No events yet.')` is retained.
- A filter selected with zero results cannot occur, since empty buckets have no
  chip.

---

## 5. What is explicitly not changing

- `src/app/globals.css` — no token, font, or palette edits.
- Every route other than `/events`.
- `src/lib/events.ts` — the availability API is consumed as-is, not modified.
- `/events/[id]` detail page.
- The `amit` satellite site.

---

## 6. Testing

Component tests follow the existing pattern in
`tests/components/AccountHeader.test.tsx`: `// @vitest-environment jsdom` pragma
plus `@testing-library/jest-dom/vitest`, since `tests/setup.ts` runs for node-env
tests and does not register DOM matchers globally.

**`tests/components/EventCard.test.tsx`**
1. A purchasable card exposes a Buy Tickets link to `/booking/<id>/checkout` and a
   link to `/events/<id>` accessibly named by the event title (the title overlay
   link of §3.2 — the `View Details →` span is decorative and is not itself a link).
2. An ended card exposes the details link, no buy link, and an `Ended` badge.
3. A completed card renders a `Completed` badge and its image carries no
   `grayscale` class — regression guard on finding 5.
4. A sold-out card shows `Sold Out` and no buy link.

**`tests/components/EventsBrowser.test.tsx`**
5. Selecting a filter chip narrows the rendered cards to that bucket.
6. No chip is rendered for an empty bucket.
7. The filter bar is absent when only one bucket is non-empty.
8. The featured panel renders the soonest upcoming event, and that event does not
   also appear in the grid.

**Regression:** `npm test` (including the existing `tests/lib/events.test.ts`) and
`npm run build` must both pass.

---

## 7. Open questions

**Brand typography and palette (QA's closing note).** QA suggests reconsidering
fonts and colours site-wide. This needs a stakeholder decision, not an
implementation choice, because the tokens are brand identity and the change would
touch every route plus the `amit` site. Deferred; needs its own spec and visual
review if pursued.
