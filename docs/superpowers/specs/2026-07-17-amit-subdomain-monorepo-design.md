# amit.lyante.art — Monorepo Satellite Site Design

**Date:** 2026-07-17
**Status:** Approved, pending implementation plan

## Goal

Bring the standalone `amit-jung-site` (Amit Jung artist + booking site) into the
Lyante repository and serve it at `amit.lyante.art`, a subdomain of the
production Lyante site (`lyante.art`). Add cross-link CTAs so visitors flow
between the artist's site and Lyante's site in both directions.

## Constraints & Decisions

- **Hosting:** Vercel. `lyante.art` is an existing Vercel project.
- **Both apps on the same stack:** amit is upgraded to **Next 16.2.6 + React
  19.2.4 + TypeScript** to match lyante. No mixed Next major versions.
- **Monorepo, separate deploys:** one repository, two independent Vercel
  projects. A change to one app does not rebuild the other.
- **No auto-redirects:** cross-navigation is via links/CTAs, not HTTP redirects.
- amit is currently a plain folder (not its own git repo), so folding it in is a
  clean move with no submodule/history concerns.

## Architecture

### Repository layout

lyante remains at the repository root (unchanged). amit becomes a pnpm
workspace package under a new `sites/` folder (room for future artist
microsites).

```
event-tickets/                 ← lyante app at root → lyante.art
├── src/ ...                    (unchanged)
├── pnpm-workspace.yaml         ← add `packages: [sites/amit]`
├── package.json                (lyante, unchanged)
└── sites/
    └── amit/                   ← ported amit site → amit.lyante.art
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   └── globals.css     (kept as-is)
        ├── components/
        │   ├── Nav.tsx
        │   ├── Hero.tsx
        │   ├── Reveal.tsx
        │   └── Booking.tsx
        ├── data/site.ts        (typed)
        ├── package.json        (Next 16, React 19, TS)
        └── tsconfig.json
```

### Deployment (two Vercel projects, one repo)

| Project | Root Directory | Domain |
|---------|---------------|--------|
| lyante  | repo root (`.`) | `lyante.art` |
| amit    | `sites/amit`    | `amit.lyante.art` |

Vercel detects the pnpm workspace and installs from the repo root for both
projects. Each project builds only its own app.

## Components of the work

### 1. Monorepo integration

- Move `../amit-jung-site` → `sites/amit`.
- Add `packages: [sites/amit]` to `pnpm-workspace.yaml` (currently only holds
  `ignoredBuiltDependencies`).
- Remove amit's `package-lock.json` (repo standardizes on pnpm; lyante uses
  `pnpm-lock.yaml`). Let the workspace lockfile manage amit's deps.

### 2. Next 16 + TypeScript port of amit

- Update `sites/amit/package.json`: `next@16.2.6`, `react@19.2.4`,
  `react-dom@19.2.4`; add TypeScript, `@types/react`, `@types/react-dom`,
  `@types/node`.
- Convert `.js` → `.tsx` for `layout`, `page`, and all four components.
- Convert `data/site.js` → `data/site.ts` with an exported `Site` interface
  typing the config object.
- Replace `jsconfig.json` with `tsconfig.json`, preserving the `@/*` → `./*`
  path alias. Add `next-env.d.ts`.
- **Per repo AGENTS.md:** read `node_modules/next/dist/docs/` and apply any
  Next 14 → 16 breaking changes before/while writing the ported code. Amit is a
  single static page with no dynamic request APIs (`cookies`/`headers`/`params`
  promises, etc.), so the migration surface is small.
- Keep amit's own `globals.css` and Google-Fonts `<link>` styling. Because amit
  deploys separately, there is no collision with lyante's Tailwind. Amit stays
  visually identical to today.

### 3. Cross-link CTAs (both directions)

- Add to `site.ts`: `lyanteUrl` (`https://lyante.art`) and a Lyante
  events/booking URL.
- **On amit.lyante.art:**
  - "Presented by Lyante Production" link in the Nav and/or footer → `lyante.art`.
  - A CTA near the booking section pointing to Lyante's events/booking.
- **On lyante.art:**
  - A "Featured Artist — Amit Jung" link/card → `https://amit.lyante.art`,
    added to the marketing `Footer.tsx` (`src/components/marketing/layout/Footer.tsx`).
  - Optionally a small featured-artist card on the marketing homepage
    (`src/app/(marketing)/page.tsx`) — exact placement confirmed during build.

### 4. Deploy & DNS (dashboard steps — documented, performed by user)

1. Create a second Vercel project from the same repo; set **Root Directory** =
   `sites/amit`, Framework = Next.js.
2. Add domain `amit.lyante.art` to the amit project.
3. Add the `CNAME` record Vercel provides at the DNS provider for `lyante.art`.
4. lyante.art project remains untouched.

## Out of scope

- Sharing components, design tokens, or Tailwind config between the two apps.
- Restructuring lyante into `apps/lyante` (it stays at root).
- Any change to amit's booking flow (still mailto + WhatsApp deep link via
  `data/site.ts`).
- Automated availability / backend for amit's calendar.

## Success criteria

- `sites/amit` builds and runs on Next 16 + TS with `pnpm --filter` from the
  repo root, visually identical to the current amit site.
- lyante at the repo root builds and runs unchanged.
- Cross-link CTAs render on both sites pointing at the correct domains.
- Documented Vercel/DNS steps let `amit.lyante.art` go live as its own project
  without affecting the `lyante.art` deployment.
