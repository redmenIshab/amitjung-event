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

### Added beyond the QA findings

**Search.** Not in the QA document; added at the product owner's request alongside
the filters. Frontend-only for now — see §4.3.

**A stronger purchase CTA.** Finding 3 only asks for *a* call to action. The
product owner asked specifically for a strong ticket-purchase button on upcoming
shows, so Buy Tickets is specced as a solid filled button rather than a text link
— see §3.2.

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
      └─ EventsBrowser.tsx  ('use client')  — search + filter chips + grid
           ├─ FeaturedEvent.tsx  — soonest LIVE event, full-width
           └─ EventCard.tsx      — reworked grid card
```

Files:

| File | Change |
|------|--------|
| `src/app/(public)/events/page.tsx` | Rewrite body; drop `UpcomingCard`/`PastCard`/`GRID` |
| `src/components/events/EventsBrowser.tsx` | **New** — client; owns search + filter state and the grid layout |
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

#### Buy Tickets is a button, not a text link

Finding 3 is rated High and asks for a *clear next step*. A gold text link does
not carry enough weight for the primary conversion action on a ticketing site, so
Buy Tickets renders as a solid, full-width button pinned to the bottom of the card
body:

| Property | Value |
|----------|-------|
| Fill | `bg-gold` → `hover:bg-gold-light`, `text-lyante-bg` |
| Type | `font-bebas text-base tracking-[0.1em] uppercase` |
| Size | full card width, `min-h-11` (44px — touch target floor) |
| Icon | `Ticket` from `lucide-react`, 16px, leading the label |
| Focus | `focus-visible:ring-2 ring-gold-light ring-offset-2 ring-offset-lyante-bg` |

It is the only solid-filled element on the card, so it reads as the primary action
against the outlined and text-only elements around it. On the featured panel
(§4.1) the same button renders larger (`min-h-14`, `text-lg`) and sits beside an
outlined `View Details` button.

**Slot is reserved when not purchasable.** Rather than collapsing, the button slot
renders a non-interactive muted bar of identical height (`bg-lyante-surface-mid`,
`text-ash`) carrying the status label. This keeps card heights uniform so grid
rows align regardless of which events are purchasable. The label resolves in this
order:

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

## 4. Layout — findings 1, 4, 7, plus search

### 4.1 Featured event (findings 4, 1)

The soonest `upcoming` event renders as a full-width split panel above the grid:

- Artwork left (~55% at `md`+), content right; stacks vertically below `md`.
- Content: `Next Show` eyebrow in `section-label`, title at
  `clamp(40px, 5vw, 72px)` in `font-bebas`, date and venue, sale badges, and both
  CTAs (`Buy Tickets` solid gold per §3.2, `View Details` outlined).
- `min-h-[420px]` at `md`+.
- Rendered only when the `upcoming` bucket is non-empty, the active filter is
  `all` or `upcoming`, **and no search query is active** (see §4.3).
- **Excluded from the grid below** so it never appears twice.

This is the actual fix for finding 1. QA's screenshot showed one upcoming event
occupying a quarter-width cell with three empty cells beside it; that event now
spans the viewport.

### 4.2 Filter bar (finding 7)

`EventsBrowser` renders chips: `All`, `Upcoming`, `Past`, `Completed`, each with a
count.

- Chips for empty buckets are not rendered.
- Default selection: `upcoming` when non-empty, otherwise `all`.
- State is plain `useState`. Not URL-synced — no shareable-filter-link requirement
  exists, and `useSearchParams` would force a Suspense boundary for marginal gain.
- Chips are `<button>` elements in a `role="tablist"`-free group with
  `aria-pressed` reflecting selection.

### 4.3 Search (frontend-only)

A search input sits in the same controls row as the chips, above the grid.

**Frontend-only by decision.** All published events are already loaded into the
page by the existing `getCachedEvents()` call, so filtering happens over the
in-memory `EventCardData[]`. No API route, no query parameter, no database
change. If the catalogue later outgrows a single page load, this becomes a
server-side search — but that is not today's problem.

| Aspect | Behaviour |
|--------|-----------|
| Matches against | `title`, `venue`, and the resolved `EVENT_TYPE_LABEL[eventType]` |
| Matching | case-insensitive substring on the trimmed query |
| Debounce | none — the array is small and filtering is synchronous |
| Composition | search intersects with the active chip: results are `bucket ∩ query` |
| Chip counts | reflect the current query, so a chip reads the number of results it would actually show |
| Zero-match chips | rendered but `disabled`, not hidden — hiding chips on each keystroke makes the bar jump |
| Clear | an `X` button inside the input, shown only when the query is non-empty |
| A11y | `type="search"` with an `sr-only` `<label>`; result count announced via `aria-live="polite"` |

**The featured panel is suppressed while a query is active** (§4.1). Promoting one
event above the results when the user has asked for something specific fights the
search; during search every match renders uniformly in the grid.

### 4.4 Controls row visibility

Search and chips share one controls row, but each has its own visibility rule,
because they stop being useful at different points:

| Control | Renders when |
|---------|--------------|
| Search input | 2 or more events in total |
| Filter chips | 2 or more **non-empty buckets** |

So a site with five events that are all upcoming gets a search box and no chips —
a lone `Upcoming` chip would filter nothing. A one-event site gets neither. The
row itself is omitted when both controls are hidden. Within a visible chip group,
individual chips still follow the empty-bucket rule in §4.2 and the
disabled-on-zero-match rule in §4.3.

The three stacked `<section>` headings collapse into a single masthead
(`LYANTE PRESENTS` / `UPCOMING SHOWS`, kept from the current design) plus this
controls row.

### 4.5 Empty states

- **No events at all:** existing `stateScreen('No events yet.')` is retained.
- **Filter with zero results:** cannot occur — empty buckets have no chip.
- **Search with zero results:** reachable, since any query may match nothing.
  The grid is replaced by an inline empty state — `No events match "<query>"` —
  with a button that clears the query and restores the previous view. This is
  inline, not the full-screen `stateScreen`, so the controls row stays on screen
  and the user can correct the query without navigating.

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
5. The Buy Tickets action carries the `bg-gold` button fill, and the
   non-purchasable variant renders the muted status bar in the same slot rather
   than omitting it — guard on the uniform-height rule in §3.2.

**`tests/components/EventsBrowser.test.tsx`**

*Filters*

6. Selecting a filter chip narrows the rendered cards to that bucket.
7. No chip is rendered for an empty bucket.
8. The controls row is absent entirely when the page has a single event.
9. Chips are absent but the search input is present when every event falls in one
   bucket — the split rule in §4.4.
10. The featured panel renders the soonest upcoming event, and that event does not
    also appear in the grid.

*Search*

11. Typing a query narrows the grid to title matches, case-insensitively.
12. A query matches on `venue` as well as `title`.
13. Search intersects with the active chip rather than replacing it — a query
    matching events in two buckets shows only the active bucket's matches.
14. Chip counts update to reflect the active query.
15. A chip with zero matches under the current query is `disabled`, not removed.
16. The featured panel is suppressed while a query is active.
17. A zero-match query renders the inline empty state, and its clear button
    restores the full result set.

**Regression:** `npm test` (including the existing `tests/lib/events.test.ts`) and
`npm run build` must both pass.

---

## 7. Open questions

**Brand typography and palette (QA's closing note).** QA suggests reconsidering
fonts and colours site-wide. This needs a stakeholder decision, not an
implementation choice, because the tokens are brand identity and the change would
touch every route plus the `amit` site. Deferred; needs its own spec and visual
review if pursued.
