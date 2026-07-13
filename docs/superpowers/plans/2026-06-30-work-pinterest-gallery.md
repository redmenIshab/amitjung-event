# /work Pinterest Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an immersive Pinterest-style masonry gallery (photos + hover-play videos, scroll-reveal, full-screen lightbox) to `/work`, below the kept `WhyWorkWithUs` section.

**Architecture:** A self-contained client feature under `src/components/marketing/work/`: a static typed data list with measured aspect ratios (`works.ts`), a CSS-columns masonry (`MasonryGrid` + `WorkTile`), a slim header with showreel band + media/genre filters (`GalleryHeader`), and a modal `Lightbox` — orchestrated by `WorkGallery` which owns filter + lightbox state. The `/work` page swaps `Portfolio` for `WorkGallery`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind (existing theme tokens: `bg-bg`, `text-ivory`, `text-ash`, `gold`, `font-cormorant`, `font-bebas`, `section-label`), next/image, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-30-work-pinterest-gallery-design.md`

## Global Constraints

- Work in `/Users/redmen/Projects/event-tickets`; pnpm; Node 22 via `source ~/.nvm/nvm.sh && nvm use 22` in the SAME bash invocation as every pnpm/tsc command.
- Do NOT modify `src/components/marketing/sections/Portfolio.tsx` or `WhyWorkWithUs.tsx` (home page still uses Portfolio; WhyWorkWithUs stays on /work).
- Code style: 2-space indent, single quotes, no semicolons.
- Test baseline: 2 pre-existing failures in `tests/lib/qr.test.ts` are accepted; gate = no NEW failures + silent `tsc --noEmit`.
- Photo dimensions must be the measured values from the spec's table (30 photos), not guesses.

---

### Task 1: works.ts — data + filter helper (TDD)

**Files:**
- Create: `src/components/marketing/work/works.ts`
- Test: `src/components/marketing/work/works.test.ts`

**Interfaces (produced):**
- `type WorkType = 'photo' | 'video'`; `type Genre = 'Concerts' | 'Creative' | 'Events' | 'Portraits'`
- `interface Work { id: string; type: WorkType; src: string; poster?: string; width: number; height: number; title: string; genre: Genre }`
- `const GENRES: Genre[]`; `type MediaFilter = 'all' | 'photo' | 'video'`
- `const WORKS: Work[]` — 31 entries (30 photos + showreel video, poster `/images/photo-11.jpg`, 1600×900)
- `filterWorks(works: Work[], media: MediaFilter, genre: Genre | null): Work[]` — AND filter, `'all'`/`null` pass through, stable order

Steps: write test (filtering AND logic, passthrough, order stability, data validity: positive dims, poster present on videos, unique ids) → watch fail → implement → pass → commit `feat: add work gallery data and filter helper`.

Titles/genres: assign each photo a short plausible title and spread genres — concert crowd/stage shots → Concerts, action/sport shots → Creative, ceremonies/gatherings → Events, single-subject shots → Portraits. Distribution roughly 10/8/6/6.

### Task 2: WorkTile + MasonryGrid

**Files:**
- Create: `src/components/marketing/work/WorkTile.tsx`
- Create: `src/components/marketing/work/MasonryGrid.tsx`

**Interfaces:**
- `WorkTile({ work, index, onOpen }: { work: Work; index: number; onOpen: () => void })` — ratio-reserved tile; photo = next/image fill + hover scale + bottom gradient caption; video = poster + hover play/pause-reset + gold ▶ badge; IntersectionObserver one-shot reveal (opacity/translate, index-based stagger, `prefers-reduced-motion` respected); whole tile a focusable button.
- `MasonryGrid({ works, onOpen }: { works: Work[]; onOpen: (index: number) => void })` — `columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-4`, tiles `break-inside-avoid mb-4`.

Verify with tsc; commit `feat: add masonry grid and work tiles`.

### Task 3: GalleryHeader + Lightbox

**Files:**
- Create: `src/components/marketing/work/GalleryHeader.tsx`
- Create: `src/components/marketing/work/Lightbox.tsx`

**Interfaces:**
- `GalleryHeader({ media, genre, onMedia, onGenre }: { media: MediaFilter; genre: Genre | null; onMedia: (m: MediaFilter) => void; onGenre: (g: Genre | null) => void })` — showreel band (muted loop video + scrim + SHOWREEL label), OUR WORK/Portfolio title, All·Photos·Videos segmented toggle, genre chips (single-select toggle off on re-click). Bebas/gold styles matching existing filter tabs.
- `Lightbox({ works, index, onClose, onNavigate }: { works: Work[]; index: number; onClose: () => void; onNavigate: (next: number) => void })` — fixed z-[100] dialog, backdrop 92% + blur, photo contained / video unmuted with controls autoplay, caption + counter, ✕/Esc/backdrop close, ←/→ keys + on-screen arrows + touch swipe (wrapping), body scroll lock with cleanup, `role="dialog" aria-modal`.

Verify with tsc; commit `feat: add gallery header and lightbox`.

### Task 4: WorkGallery orchestrator + page swap

**Files:**
- Create: `src/components/marketing/work/WorkGallery.tsx`
- Modify: `src/app/(marketing)/work/page.tsx`

**Interfaces:**
- `WorkGallery()` (default-style named export, client) — owns `media`, `genre`, `lightboxIndex: number | null`; `filtered = filterWorks(WORKS, media, genre)`; renders GalleryHeader, MasonryGrid (fade-on-filter via key or transition), Lightbox when open.
- Page keeps spacer + WhyWorkWithUs + back-link; replaces `<Portfolio />` with `<WorkGallery />`.

Verify: tsc silent; vitest no new failures; commit `feat: replace /work portfolio with immersive Pinterest gallery`.

### Task 5: Verification

- `tsc --noEmit` silent; `vitest run` = baseline only.
- Optional dev-server smoke if a server is available; visual pass is the user's call.
