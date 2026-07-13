# Lyante /work — Pinterest-Style Immersive Gallery Design Spec

## Purpose

Rebuild the portfolio area of the `/work` page as an immersive, Pinterest-style masonry gallery of photo and video works. Tiles keep their true aspect ratios, reveal on scroll, play video on hover, and open into a full-screen lightbox with keyboard/swipe navigation. The existing `WhyWorkWithUs` intro section stays above the gallery.

## Scope

- **In scope:** the portfolio experience on `/work` (`src/app/(marketing)/work/page.tsx`) and a new self-contained gallery feature under `src/components/marketing/work/`.
- **Out of scope:** the home page's `Portfolio` section (untouched — still used on `/`), other marketing pages, the 3D ticketing journey, any backend/CMS. The gallery is a static data list.

## Page structure

`src/app/(marketing)/work/page.tsx` (server component) renders, in order:

1. `<div className="pt-24" />` spacer (keep — clears the fixed nav)
2. `<WhyWorkWithUs />` — unchanged, kept per user request
3. `<WorkGallery />` — the new client feature (slim header + masonry + lightbox)
4. The existing "← Back to Home" link footer (keep)

The old `<Portfolio />` import is removed from `/work` only. `Portfolio.tsx` itself is not modified (still imported by the home page).

## File layout

New feature directory `src/components/marketing/work/`:

```
works.ts          — Work type + WORKS data array (measured ratios baked in), GENRES/TYPES constants, helpers
WorkGallery.tsx   — client orchestrator: filter state, lightbox index state, header, MasonryGrid, Lightbox
GalleryHeader.tsx — showreel strip + title + media toggle + genre chips
MasonryGrid.tsx   — CSS-columns masonry container; renders WorkTile list
WorkTile.tsx      — one tile (photo or video), hover behavior, scroll-reveal
Lightbox.tsx      — full-screen overlay, keyboard + swipe nav, body-scroll lock
```

## Data model

```ts
// works.ts
export type WorkType = 'photo' | 'video'
export type Genre = 'Concerts' | 'Creative' | 'Events' | 'Portraits'

export interface Work {
  id: string
  type: WorkType
  src: string        // '/images/photo-N.jpg' or '/video/clip.mp4'
  poster?: string    // video poster frame (photo path); required for video tiles
  width: number      // real pixel width  — drives masonry aspect ratio
  height: number     // real pixel height
  title: string
  genre: Genre
}
```

### Measured photo dimensions (baked into WORKS, no runtime measuring)

All 30 photos exist in `public/images/`. Exact pixel sizes:

| file | w × h | file | w × h | file | w × h |
|------|-------|------|-------|------|-------|
| photo-1 | 5712×4284 | photo-11 | 1600×900 | photo-21 | 3200×4000 |
| photo-2 | 4284×5712 | photo-12 | 1066×1600 | photo-22 | 4000×5000 |
| photo-3 | 1066×1600 | photo-13 | 3200×4000 | photo-23 | 4000×5000 |
| photo-4 | 1066×1600 | photo-14 | 3000×3750 | photo-24 | 4000×5000 |
| photo-5 | 1066×1600 | photo-15 | 2649×3311 | photo-25 | 2649×3311 |
| photo-6 | 1066×1600 | photo-16 | 2649×3311 | photo-26 | 1080×1350 |
| photo-7 | 1600×900 | photo-17 | 2649×3311 | photo-27 | 1080×1350 |
| photo-8 | 1600×900 | photo-18 | 2649×3311 | photo-28 | 3000×3750 |
| photo-9 | 1600×900 | photo-19 | 4000×5000 | photo-29 | 4000×5000 |
| photo-10 | 1066×1600 | photo-20 | 3000×3750 | photo-30 | 4000×5000 |

(25 portrait, 5 landscape — a portrait-heavy mix that suits masonry.)

### Genres and titles

The data currently has generic titles ("Xtreme Action Shot"). The new list assigns each photo a `genre` (spread across Concerts / Creative / Events / Portraits) and a plausible short title. Exact title/genre assignments are the implementer's call within these four genres — the plan will specify them concretely so there are no placeholders. `showreel.mov` is the one seed **video** entry: `type: 'video'`, `src: '/video/showreel.mov'`, `poster: '/images/photo-11.jpg'`, `genre: 'Concerts'`, with a representative 16:9 width/height (1600×900). More videos are appended here later.

## Masonry layout

- CSS `columns`: `columns-1` (mobile) / `sm:columns-2` / `lg:columns-3` / `2xl:columns-4`, `gap` ≈ 16px, each tile `break-inside-avoid` with `mb-4`.
- Each tile reserves its height up-front from the measured ratio (`aspect-ratio: w / h` on the media wrapper), so columns interlock at organic heights and there is **no layout shift** as images stream in.
- Filtering re-renders the list; a short opacity fade on the grid smooths the reflow.

## Tile behavior (`WorkTile`)

- **Photo:** `next/image` `fill` + `object-cover` inside the ratio wrapper; `sizes` set per breakpoint; hover `scale-[1.04]` (500ms). Hover reveals a bottom-rising gold-tinted gradient with `title` (cormorant italic) + `genre` (section-label). Rounded corners, brand gold accent — consistent with existing tiles.
- **Video:** muted, `loop`, `playsInline` `<video>` with `poster`. **Plays on pointer-enter, pauses + resets on leave** (`preload="metadata"`, guarded play/pause promise). A small gold ▶ badge sits top-right at rest so video tiles are identifiable before hover.
- **Scroll-reveal:** one shared `IntersectionObserver` (or per-tile) toggles a `revealed` class → `opacity 0→1`, `translateY 16px→0`, ~500ms ease, with a small stagger derived from the tile's index. Fires once per tile. Disabled under `prefers-reduced-motion` (tiles render fully visible).
- Whole tile is a `<button>`/clickable → opens the lightbox at this work's index within the *filtered* list.

## Header (`GalleryHeader`)

Below `WhyWorkWithUs`, above the grid:

- A thin cinematic band: `showreel.mov` autoplaying muted/looping (`object-cover`, ~h-64/h-96) with a dark scrim and a `SHOWREEL` label — reused from the current Portfolio treatment.
- `OUR WORK` section-label + `Portfolio` cormorant title.
- **Media toggle:** `All · Photos · Videos` (segmented, gold active state).
- **Genre chips:** `Concerts · Creative · Events · Portraits` (multi- or single-select — single-select for simplicity: one active genre or "all"). Chips styled like the existing bebas filter tabs.
- Active filters combine as AND (media type AND genre). "All"/no-genre means no constraint on that axis.

## Lightbox (`Lightbox`)

- Opens on tile click; `position: fixed inset-0 z-[100]`, backdrop `rgba(8,8,8,0.92)` + slight blur.
- Shows the current work large and centered: photo (`next/image`, contained, max 90vw/90vh) or **video unmuted with native controls, autoplaying**.
- Caption: title + genre, bottom-left; a work counter (e.g. "07 / 18") bottom-right.
- Controls: close via ✕ button, `Esc`, or backdrop click; prev/next via on-screen arrows, `←`/`→` keys, and horizontal touch **swipe**. Navigation wraps within the *currently filtered* set.
- Body scroll locked while open (`overflow: hidden` on `document.body`, restored on close). Focus moved to the dialog; `role="dialog"` `aria-modal`.
- Re-opening respects the active filters (index maps into the filtered array).

## Accessibility & performance

- All tiles keyboard-focusable and Enter/Space-activatable; lightbox is a labeled modal dialog with Esc close and focus handling.
- `prefers-reduced-motion` disables scroll-reveal and hover-scale transitions.
- Images via `next/image` with correct `sizes`; only the first ~6 tiles eager, rest lazy. Video tiles `preload="metadata"` and only load/play the source on hover to avoid 30 simultaneous video fetches.
- Aspect-ratio reservation prevents cumulative layout shift.

## Testing

- `works.ts` gets Vitest coverage of any pure helpers (e.g. a `filterWorks(works, mediaType, genre)` function): correct AND filtering, "all" passthrough, stable order, and that every WORKS entry has positive width/height and a poster when `type === 'video'`.
- Visual behavior (masonry reflow, hover-play, lightbox nav) verified via dev server, not unit tests.
- `tsc --noEmit` clean; existing suite still passes (note: the repo has 2 pre-existing unrelated `tests/lib/qr.test.ts` failures that are out of scope here).

## Out of scope / future

- Real per-video poster generation (uses an existing photo as poster for the seed video).
- Infinite scroll / pagination (all works render at once; fine for tens of items).
- CMS or per-work detail routes.
