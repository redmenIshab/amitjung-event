# amit.lyante.art Satellite Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the standalone `amit-jung-site` into the Lyante repo as a pnpm workspace app at `sites/amit`, upgrade it to Next 16 + TypeScript, add cross-link CTAs between it and Lyante, and document the Vercel/DNS steps to deploy it at `amit.lyante.art`.

**Architecture:** One repository, two independent Vercel projects. Lyante stays at the repo root (unchanged, `lyante.art`). Amit moves to `sites/amit` and deploys as a separate Vercel project (Root Directory `sites/amit`) with the `amit.lyante.art` domain. Amit keeps its own plain CSS, so there is no Tailwind collision — the two apps never share a bundle.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, TypeScript, pnpm workspaces, Vercel.

## Global Constraints

- Amit runtime: `next@16.2.6`, `react@19.2.4`, `react-dom@19.2.4` — pinned to match lyante's root `package.json`.
- TypeScript `>=5` (repo already uses TS 5 in root). Node `>=20.9`.
- Repo standardizes on **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). No `package-lock.json` in `sites/amit`.
- Amit stays visually identical to the current site — keep `app/globals.css` and the Google-Fonts `<link>` verbatim.
- Lyante at the repo root must remain buildable and unchanged except for the single footer cross-link edit in Task 5.
- Amit's booking flow is unchanged (mailto + WhatsApp deep link driven by `data/site.ts`).
- Cross-links are plain anchors to absolute URLs — no HTTP redirects.
- Amit's canonical management/booking copy already references "Lyante Production" and `bookings@lyanteproduction.com`; do not change those.

---

### Task 1: Move amit into the monorepo and upgrade its toolchain to Next 16 + TypeScript

**Files:**
- Move: `../amit-jung-site/{app,components,data}` → `sites/amit/{app,components,data}`
- Create: `sites/amit/package.json`
- Create: `sites/amit/tsconfig.json`
- Create: `sites/amit/next.config.ts`
- Create: `sites/amit/next-env.d.ts`
- Create: `sites/amit/.gitignore`
- Delete (do not copy): the moved copy's `node_modules/`, `.next/`, `package-lock.json`, `build.log`, `.DS_Store`, `jsconfig.json`, `next.config.mjs`, old `package.json`, `README.md`
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Produces: a `sites/amit` workspace package named `amit-jung-site`, buildable with `pnpm --filter amit-jung-site <script>` from the repo root.

- [ ] **Step 1: Copy the source tree into `sites/amit` (source files only)**

Run from repo root (`/Users/redmen/Projects/event-tickets`):

```bash
mkdir -p sites/amit
cp -R ../amit-jung-site/app sites/amit/app
cp -R ../amit-jung-site/components sites/amit/components
cp -R ../amit-jung-site/data sites/amit/data
# scrub any stray macOS metadata that came along
find sites/amit -name '.DS_Store' -delete
```

Do NOT copy `node_modules`, `.next`, `package-lock.json`, `build.log`, `jsconfig.json`, `next.config.mjs`, the old `package.json`, or the old `README.md` — those are replaced below.

- [ ] **Step 2: Create `sites/amit/package.json`**

```json
{
  "name": "amit-jung-site",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19"
  }
}
```

- [ ] **Step 3: Create `sites/amit/tsconfig.json`**

Mirrors the shape Next generates, preserving the `@/*` → `./*` alias amit's imports rely on.

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `sites/amit/next.config.ts`**

Preserves the one option the old `next.config.mjs` set.

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

- [ ] **Step 5: Create `sites/amit/next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 6: Create `sites/amit/.gitignore`**

```gitignore
/node_modules
/.next
/out
*.tsbuildinfo
next-env.d.ts
.DS_Store
```

- [ ] **Step 7: Register the workspace package in `pnpm-workspace.yaml`**

The current file only has `ignoredBuiltDependencies`. Add a `packages` key. Final file:

```yaml
packages:
  - sites/amit

ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

- [ ] **Step 8: Install and verify the workspace resolves**

Run from repo root:

```bash
pnpm install
pnpm --filter amit-jung-site exec next --version
```

Expected: install completes without error; `next` prints `Next.js v16.2.6`.

- [ ] **Step 9: Commit**

```bash
git add sites/amit package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat: add amit-jung-site as sites/amit workspace on Next 16 + TS"
```

---

### Task 2: Port amit's source from JS to TypeScript (identical behavior)

Convert the 7 source files to `.tsx`/`.ts` with types. `app/globals.css` is copied verbatim (no change). Behavior and markup stay identical.

**Files:**
- Rename+edit: `sites/amit/data/site.js` → `sites/amit/data/site.ts`
- Rename+edit: `sites/amit/components/Reveal.js` → `Reveal.tsx`
- Rename+edit: `sites/amit/components/Nav.js` → `Nav.tsx`
- Rename+edit: `sites/amit/components/Hero.js` → `Hero.tsx`
- Rename+edit: `sites/amit/components/Booking.js` → `Booking.tsx`
- Rename+edit: `sites/amit/app/layout.js` → `layout.tsx`
- Rename+edit: `sites/amit/app/page.js` → `page.tsx`
- Unchanged: `sites/amit/app/globals.css`

**Interfaces:**
- Produces: `Site` type and `site: Site` from `@/data/site`; default-exported components `Nav`, `Hero`, `Reveal`, `Booking`. `Reveal` props: `{ children: React.ReactNode; as?: React.ElementType; className?: string }`.

- [ ] **Step 1: Convert `data/site.js` → `data/site.ts` with a `Site` type**

Delete `data/site.js`, create `data/site.ts`. Same data values as the original, plus a typed shape. (Cross-link fields are added in Task 3 — do not add them here.)

```ts
// ─── Site configuration — edit everything here ──────────────────────────────
// Lyante Production updates this single file: contact routes, links,
// booked dates, discography. No other file needs touching.

export interface SiteWork {
  k: string
  title: string
  text: string
  href: string
  cta: string
}

export interface Site {
  artist: string
  artistDevanagari: string
  tagline: string
  album: string
  albumYear: string
  management: string
  bookingEmail: string
  whatsapp: string
  socials: {
    instagram: string
    tiktok: string
    facebook: string
    soundcloud: string
    youtube: string
  }
  videos: { id: string; title: string }[]
  tracks: { url: string; title: string }[]
  works: SiteWork[]
  stats: { n: string; l: string }[]
  bookedDates: string[]
  slots: string[]
}

export const site: Site = {
  artist: 'Amit Jung',
  artistDevanagari: 'अमित जंग',
  tagline: 'Singer-songwriter · Kathmandu, Nepal',
  album: 'मेरो देश को कथा',
  albumYear: '2026',
  management: 'Lyante Production',

  bookingEmail: 'bookings@lyanteproduction.com',
  whatsapp: '9779800000000',

  socials: {
    instagram: 'https://www.instagram.com/iamamitjung/',
    tiktok: 'https://www.tiktok.com/@amitjung555',
    facebook: 'https://www.facebook.com/amithustle/',
    soundcloud: 'https://soundcloud.com/amit-jung-official',
    youtube: 'https://www.youtube.com/watch?v=j3i9QU8bYqQ',
  },

  videos: [{ id: 'j3i9QU8bYqQ', title: 'Barsa Bhayecha Nepal Nafarkeko' }],

  tracks: [
    { url: 'https://soundcloud.com/amit-jung-official/siddhartha-amit-jung', title: 'Siddhartha' },
    { url: 'https://soundcloud.com/amit-jung-official/samjhana-timilai-amit-jung-final-audio', title: 'Samjhana Timilai' },
    { url: 'https://soundcloud.com/amit-jung-official/barsha-bhayecha-nepal-na-farkayeko-unansweredby-amit-jung', title: 'Barsha Bhayecha Nepal Na Farkayeko' },
  ],

  works: [
    {
      k: 'Press',
      title: 'Featured — The Kathmandu Post',
      text: 'Profiled among Nepal’s leading independent voices in “Are Nepali independent singers struggling for a platform?”',
      href: 'https://kathmandupost.com/art-culture/2024/10/26/are-nepali-independent-singers-struggling-for-a-platform',
      cta: 'Read the feature',
    },
    {
      k: 'Live',
      title: 'Live at Moksh, Jhamsikhel',
      text: 'Regular headline sets at Kathmandu valley’s home of live original music.',
      href: 'https://www.instagram.com/iamamitjung/',
      cta: 'Watch clips',
    },
    {
      k: 'Album',
      title: 'Debut album — मेरो देश को कथा',
      text: 'A story-driven full-length record about home, distance and return. Releasing 2026 under Lyante Production.',
      href: 'https://www.instagram.com/iamamitjung/',
      cta: 'Follow the journey',
    },
    {
      k: 'Signature',
      title: 'Barsa Bhayecha Nepal Nafarkeko',
      text: 'The diaspora anthem — written for every Nepali who has watched Dashain pass from far away.',
      href: 'https://www.youtube.com/watch?v=j3i9QU8bYqQ',
      cta: 'Listen on YouTube',
    },
  ],

  stats: [
    { n: '8+', l: 'years in craft' },
    { n: '460+', l: 'released works & posts' },
    { n: '10K+', l: 'listeners following' },
    { n: '2026', l: 'debut album' },
  ],

  bookedDates: [
    '2026-07-24', '2026-07-25', '2026-08-01', '2026-08-08',
    '2026-08-15', '2026-08-29', '2026-09-05', '2026-09-19',
  ],

  slots: ['Evening set (45–60 min)', 'Full show (90+ min)', 'Private / corporate event', 'Festival slot'],
}
```

- [ ] **Step 2: Convert `components/Reveal.js` → `Reveal.tsx`**

Delete `Reveal.js`, create `Reveal.tsx`. Only types added; behavior identical.

```tsx
'use client'

import { useEffect, useRef } from 'react'
import type { ElementType, ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  as?: ElementType
  className?: string
}

/** Wraps children; fades/slides them in when scrolled into view. */
export default function Reveal({ children, as: Tag = 'div', className = '' }: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('in')
          io.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={`reveal ${className}`}>
      {children}
    </Tag>
  )
}
```

- [ ] **Step 3: Convert `components/Nav.js` → `Nav.tsx`**

Delete `Nav.js`, create `Nav.tsx`. (Cross-link added in Task 3; keep as-is here.)

```tsx
'use client'

import { useEffect, useState } from 'react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap nav-inner">
        <a href="#top" className="nav-logo">
          AMIT<span>JUNG</span>
        </a>
        <div className="nav-links">
          <a href="#music">Music</a>
          <a href="#works">Works</a>
          <a href="#booking" className="nav-cta">
            Book a date
          </a>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Convert `components/Hero.js` → `Hero.tsx`**

Delete `Hero.js`, create `Hero.tsx`. Type the canvas ref and guard nulls; animation logic unchanged.

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { site } from '@/data/site'

/** Animated waveform canvas — layered sine waves drifting like a live signal. */
function Waves() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const layers = [
      { amp: 42, freq: 0.006, speed: 0.012, color: 'rgba(220,47,63,0.35)', w: 1.6 },
      { amp: 30, freq: 0.009, speed: -0.008, color: 'rgba(212,169,78,0.22)', w: 1.2 },
      { amp: 58, freq: 0.004, speed: 0.006, color: 'rgba(242,237,228,0.10)', w: 1 },
      { amp: 20, freq: 0.013, speed: 0.018, color: 'rgba(220,47,63,0.16)', w: 1 },
    ]

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      const baseY = h * 0.62

      layers.forEach((L, li) => {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 3) {
          const env = Math.sin((x / w) * Math.PI)
          const y =
            baseY +
            Math.sin(x * L.freq + t * L.speed * 60 + li * 2) * L.amp * env * (1 + 0.3 * Math.sin(t * 0.5 + li))
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = L.color
        ctx.lineWidth = L.w
        ctx.stroke()
      })

      t += 0.016
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />
}

export default function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-glow" />
      <Waves />
      <div className="wrap hero-inner">
        <p className="hero-kicker">
          {site.tagline} · Managed by {site.management}
        </p>
        <h1>
          {site.artist.split(' ')[0]} <em>{site.artist.split(' ')[1]}</em>
        </h1>
        <p className="hero-deva devanagari">
          {site.album} — {site.albumYear}
        </p>
        <p className="hero-sub">
          Eight years of original Nepali music — songs about home, distance and return. Now writing the debut album.
          Available for live shows, festivals and private events.
        </p>
        <div className="hero-actions">
          <a href="#booking" className="btn btn-primary">
            Check availability
          </a>
          <a href="#music" className="btn btn-ghost">
            Listen first
          </a>
        </div>
      </div>
      <div className="hero-scroll">scroll</div>
    </header>
  )
}
```

- [ ] **Step 5: Convert `components/Booking.js` → `Booking.tsx`**

Delete `Booking.js`, create `Booking.tsx`. Add types for the view/form state and the `set`/`shift`/`isPast` helpers; logic identical. (Cross-link CTA added in Task 3.)

```tsx
'use client'

import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { site } from '@/data/site'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

interface Form {
  name: string
  org: string
  email: string
  slot: string
  venue: string
  message: string
}

export default function Booking() {
  const today = useMemo(() => {
    const t = new Date()
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() }
  }, [])

  const [view, setView] = useState({ y: today.y, m: today.m })
  const [selected, setSelected] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState<Form>({
    name: '',
    org: '',
    email: '',
    slot: site.slots[0],
    venue: '',
    message: '',
  })

  const booked = useMemo(() => new Set(site.bookedDates), [])

  const maxView = useMemo(() => {
    const d = new Date(today.y, today.m + 6, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  }, [today])

  const canPrev = view.y > today.y || view.m > today.m
  const canNext = view.y < maxView.y || view.m < maxView.m

  const shift = (dir: number) => {
    const d = new Date(view.y, view.m + dir, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  const firstDow = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isPast = (d: number) =>
    view.y === today.y && view.m === today.m ? d < today.d : false

  const set =
    (k: keyof Form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value })

  const mailBody = () =>
    encodeURIComponent(
      `Booking request — ${site.artist}\n\n` +
        `Date: ${selected}\n` +
        `Slot: ${form.slot}\n` +
        `Organizer: ${form.name}\n` +
        `Organization: ${form.org}\n` +
        `Reply-to: ${form.email}\n` +
        `Venue / City: ${form.venue}\n\n` +
        `Details:\n${form.message}\n\n` +
        `— sent from amitjung official site`
    )

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    window.location.href = `mailto:${site.bookingEmail}?subject=${encodeURIComponent(
      `Booking request: ${site.artist} — ${selected}`
    )}&body=${mailBody()}`
    setSent(true)
  }

  const waLink = () =>
    `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
      `Hi ${site.management}, I'd like to book ${site.artist} on ${selected} (${form.slot}). — ${form.name}, ${form.org}`
    )}`

  return (
    <div className="booking-grid">
      {/* Calendar */}
      <div className="cal">
        <div className="cal-head">
          <h3>
            {MONTHS[view.m]} {view.y}
          </h3>
          <div className="cal-nav">
            <button onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month">
              ←
            </button>
            <button onClick={() => shift(1)} disabled={!canNext} aria-label="Next month">
              →
            </button>
          </div>
        </div>

        <div className="cal-grid">
          {DOW.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />
            const dateStr = iso(view.y, view.m, d)
            const isBooked = booked.has(dateStr)
            const past = isPast(d)
            const sel = selected === dateStr
            return (
              <button
                key={dateStr}
                className={`cal-day ${isBooked ? 'booked' : 'open'} ${sel ? 'selected' : ''}`}
                disabled={past || isBooked}
                onClick={() => {
                  setSelected(dateStr)
                  setSent(false)
                }}
              >
                {d}
              </button>
            )
          })}
        </div>

        <div className="cal-legend">
          <span className="lg-open">
            <i />
            Available
          </span>
          <span className="lg-booked">
            <i />
            Booked
          </span>
          <span className="lg-sel">
            <i />
            Your date
          </span>
        </div>
      </div>

      {/* Inquiry form */}
      <form className="bform" onSubmit={submit}>
        <div className="bform-date">
          {selected ? (
            <>
              Requesting <b>{selected}</b> — pick a slot and tell us about the event.
            </>
          ) : (
            <>Select an available date on the calendar to begin.</>
          )}
        </div>

        <div className="bform-row">
          <div>
            <label>Your name</label>
            <input required value={form.name} onChange={set('name')} placeholder="Full name" />
          </div>
          <div>
            <label>Organization</label>
            <input required value={form.org} onChange={set('org')} placeholder="Company / event brand" />
          </div>
        </div>

        <div className="bform-row">
          <div>
            <label>Email</label>
            <input type="email" required value={form.email} onChange={set('email')} placeholder="you@company.com" />
          </div>
          <div>
            <label>Performance slot</label>
            <select value={form.slot} onChange={set('slot')}>
              {site.slots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label>Venue / city</label>
          <input value={form.venue} onChange={set('venue')} placeholder="e.g. Moksh, Jhamsikhel — Kathmandu" />
        </div>

        <div>
          <label>Event details</label>
          <textarea
            rows={4}
            value={form.message}
            onChange={set('message')}
            placeholder="Audience size, event type, budget range, technical setup…"
          />
        </div>

        {sent && (
          <div className="bform-success">
            Your email app should have opened with the request. Prefer chat? Send the same request on{' '}
            <a href={waLink()} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
              WhatsApp
            </a>
            . {site.management} confirms within 24 hours with a formal agreement.
          </div>
        )}

        <div className="bform-actions">
          <button type="submit" className="btn btn-primary" disabled={!selected}>
            Request this date
          </button>
          {selected && (
            <a className="btn btn-ghost" href={waLink()} target="_blank" rel="noreferrer">
              WhatsApp instead
            </a>
          )}
        </div>

        <p className="bform-note">
          Requests go directly to {site.management}. A booking is confirmed only after a written agreement and deposit —
          the calendar shows live availability, not confirmation.
        </p>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Convert `app/layout.js` → `layout.tsx`**

Delete `layout.js`, create `layout.tsx`. Type `metadata` and the children prop; head/fonts unchanged.

```tsx
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amit Jung — Official | Bookings & Music',
  description:
    'Amit Jung — Nepali singer-songwriter. Debut album मेरो देश को कथा (2026). Listen, watch, and book him for your event. Managed by Lyante Production.',
  openGraph: {
    title: 'Amit Jung — Official',
    description:
      'Nepali singer-songwriter. Debut album मेरो देश को कथा (2026). Book for live events.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#080808',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,900;1,300&family=Inter:wght@400;500;600&family=Yatra+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: Convert `app/page.js` → `page.tsx`**

Delete `page.js`, create `page.tsx`. Type the SoundCloud helper; content identical. (Cross-link CTA added in Task 3.)

```tsx
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Reveal from '@/components/Reveal'
import Booking from '@/components/Booking'
import { site } from '@/data/site'

const sc = (url: string) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    url
  )}&color=%23dc2f3f&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`

export default function Page() {
  const marquee = (
    <span className="marquee-item">
      {[
        site.album,
        'Live at Moksh',
        'The Kathmandu Post',
        'Barsa Bhayecha Nepal Nafarkeko',
        'Kathmandu · Lalitpur · Worldwide',
      ].map((t, i) => (
        <span key={i}>
          {t} <i>◆</i>
        </span>
      ))}
    </span>
  )

  return (
    <main className="grain">
      <Nav />
      <Hero />

      {/* marquee */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {marquee}
          {marquee}
        </div>
      </div>

      {/* stats */}
      <section id="about">
        <div className="wrap">
          <Reveal>
            <div className="stats">
              {site.stats.map((s) => (
                <div className="stat" key={s.l}>
                  <b>{s.n}</b>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* music */}
      <section id="music" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <p className="sec-kicker">Music</p>
            <h2>Songs about home, distance and return</h2>
            <p>
              Original Nepali music written across eight years — from diaspora anthems to the stories behind the
              upcoming debut album <span className="devanagari">{site.album}</span>.
            </p>
          </Reveal>

          <div className="music-grid">
            <Reveal>
              <figure className="video-card">
                <iframe
                  src={`https://www.youtube.com/embed/${site.videos[0].id}`}
                  title={site.videos[0].title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <figcaption>
                  “{site.videos[0].title}” — the song that connected Amit to Nepalis around the world.
                </figcaption>
              </figure>
            </Reveal>

            <Reveal className="tracks">
              {site.tracks.map((t) => (
                <div className="track" key={t.url}>
                  <iframe src={sc(t.url)} title={t.title} loading="lazy" />
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* works */}
      <section id="works" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <p className="sec-kicker">Portfolio</p>
            <h2>Selected works & press</h2>
          </Reveal>
          <div className="works-grid">
            {site.works.map((w) => (
              <Reveal key={w.title} className="work">
                <span className="work-k">{w.k}</span>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
                <a href={w.href} target="_blank" rel="noreferrer">
                  {w.cta} →
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* booking */}
      <section id="booking">
        <div className="wrap">
          <Reveal className="sec-head">
            <p className="sec-kicker">For event organizers</p>
            <h2>Availability & booking</h2>
            <p>
              Pick an open date, send the request, and {site.management} will come back within 24 hours with terms and a
              formal agreement.
            </p>
          </Reveal>
          <Booking />
        </div>
      </section>

      {/* footer */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              AMIT<span style={{ color: 'var(--crimson)' }}>JUNG</span>
              <small>
                Represented by {site.management} · {site.bookingEmail}
              </small>
            </div>
            <div className="foot-social">
              <a href={site.socials.instagram} target="_blank" rel="noreferrer">Instagram</a>
              <a href={site.socials.tiktok} target="_blank" rel="noreferrer">TikTok</a>
              <a href={site.socials.youtube} target="_blank" rel="noreferrer">YouTube</a>
              <a href={site.socials.soundcloud} target="_blank" rel="noreferrer">SoundCloud</a>
              <a href={site.socials.facebook} target="_blank" rel="noreferrer">Facebook</a>
            </div>
          </div>
          <div className="foot-line">
            <span>
              © {new Date().getFullYear()} {site.artist} · {site.management}
            </span>
            <span className="devanagari">{site.album} — {site.albumYear}</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
```

- [ ] **Step 8: Typecheck the ported app**

```bash
pnpm --filter amit-jung-site run typecheck
```

Expected: no errors. If `tsc` complains about a missing `.js` extension for a deleted file, confirm every `.js` source in Step 1–7 was deleted after its `.tsx`/`.ts` replacement was created.

- [ ] **Step 9: Production build**

```bash
pnpm --filter amit-jung-site run build
```

Expected: `✓ Compiled successfully`, one static route `/` in the output.

- [ ] **Step 10: Visual smoke test**

```bash
pnpm --filter amit-jung-site run dev
```

Open `http://localhost:3000`. Confirm: hero waveform animates, marquee scrolls, calendar renders with July 2026 booked dates struck out, selecting a date enables "Request this date". Stop the dev server.

- [ ] **Step 11: Commit**

```bash
git add sites/amit
git commit -m "refactor: port amit site to TypeScript (Next 16)"
```

---

### Task 3: Add cross-link CTAs on the amit site → Lyante

**Files:**
- Modify: `sites/amit/data/site.ts` (add `lyanteUrl`, `lyanteEventsUrl` to `Site` + `site`)
- Modify: `sites/amit/components/Nav.tsx` (add "Lyante" link)
- Modify: `sites/amit/app/page.tsx` (footer credit link + a CTA under the booking section)

**Interfaces:**
- Consumes: `site.lyanteUrl`, `site.lyanteEventsUrl` from `@/data/site`.
- Produces: outbound links from amit.lyante.art to `https://lyante.art` and `https://lyante.art/ticketing`.

- [ ] **Step 1: Add Lyante URLs to `data/site.ts`**

In `sites/amit/data/site.ts`, add two fields to the `Site` interface, immediately after `management: string`:

```ts
  management: string
  lyanteUrl: string
  lyanteEventsUrl: string
```

And add the values to the `site` object, immediately after `management: 'Lyante Production',`:

```ts
  management: 'Lyante Production',
  lyanteUrl: 'https://lyante.art',
  lyanteEventsUrl: 'https://lyante.art/ticketing',
```

- [ ] **Step 2: Add a "Lyante" link to `Nav.tsx`**

In `sites/amit/components/Nav.tsx`, add the import and a nav link. Change the imports line to also pull in `site`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { site } from '@/data/site'
```

Then, inside `<div className="nav-links">`, add a Lyante link as the first child (before "Music"):

```tsx
        <div className="nav-links">
          <a href={site.lyanteUrl} target="_blank" rel="noreferrer">
            Lyante
          </a>
          <a href="#music">Music</a>
          <a href="#works">Works</a>
          <a href="#booking" className="nav-cta">
            Book a date
          </a>
        </div>
```

- [ ] **Step 3: Add a Lyante CTA under the booking section in `page.tsx`**

In `sites/amit/app/page.tsx`, inside the `{/* booking */}` section, immediately after `<Booking />` and before the closing `</div>` of `.wrap`, add:

```tsx
          <Booking />
          <p className="bform-note" style={{ textAlign: 'center', marginTop: '2rem' }}>
            Planning a full event?{' '}
            <a href={site.lyanteEventsUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
              {site.management} produces live shows, ticketing and branding →
            </a>
          </p>
```

- [ ] **Step 4: Turn the footer management credit into a link**

In `sites/amit/app/page.tsx`, in the `{/* footer */}` block, replace the `.foot-brand` `<small>` line:

```tsx
              <small>
                Represented by {site.management} · {site.bookingEmail}
              </small>
```

with a linked version:

```tsx
              <small>
                Represented by{' '}
                <a href={site.lyanteUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--gold, #d4a94e)' }}>
                  {site.management}
                </a>{' '}
                · {site.bookingEmail}
              </small>
```

- [ ] **Step 5: Typecheck, build, visual check**

```bash
pnpm --filter amit-jung-site run typecheck
pnpm --filter amit-jung-site run build
pnpm --filter amit-jung-site run dev
```

Open `http://localhost:3000`: confirm the nav shows "Lyante" (opens `lyante.art` in a new tab), the booking section shows the Lyante events CTA, and the footer "Lyante Production" credit is a link. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add sites/amit
git commit -m "feat: cross-link amit site to lyante.art"
```

---

### Task 4: Add the "Featured Artist" cross-link on lyante.art → amit

**Files:**
- Modify: `src/components/marketing/layout/Footer.tsx`

**Interfaces:**
- Produces: outbound link from lyante.art footer to `https://amit.lyante.art`.

- [ ] **Step 1: Add an "ARTISTS" footer column pointing to amit**

In `src/components/marketing/layout/Footer.tsx`, extend the `FOOTER_LINKS` object with an `ARTISTS` column. Change:

```tsx
  COMPANY: [
    { label: 'About', href: '/#about' },
    { label: 'Work', href: '/work' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
  ],
}
```

to:

```tsx
  COMPANY: [
    { label: 'About', href: '/#about' },
    { label: 'Work', href: '/work' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
  ],
  ARTISTS: [
    { label: 'Amit Jung', href: 'https://amit.lyante.art' },
  ],
}
```

Note: the footer renders `FOOTER_LINKS` columns with Next's `<Link>`. `<Link>` renders a plain `<a>` for absolute URLs, so `https://amit.lyante.art` works without changes. The grid is `md:grid-cols-4`; adding a column keeps a balanced layout (brand + 3 link columns already flow into the 4-col grid, and the extra CONTACT column wraps gracefully — verify visually in Step 3).

- [ ] **Step 2: Typecheck lyante**

```bash
pnpm exec tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Build lyante and visually confirm the footer**

```bash
pnpm run build
```

Expected: build succeeds. Then run `pnpm dev`, open `http://localhost:3000`, scroll to the footer, and confirm an "ARTISTS" column with an "Amit Jung" link is present and points to `https://amit.lyante.art`. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/layout/Footer.tsx
git commit -m "feat: link lyante footer to amit.lyante.art featured artist"
```

---

### Task 5: Document Vercel + DNS deploy steps

**Files:**
- Create: `sites/amit/README.md`

**Interfaces:**
- Produces: operator instructions to stand up the second Vercel project and DNS.

- [ ] **Step 1: Write `sites/amit/README.md`**

```markdown
# Amit Jung — sites/amit (amit.lyante.art)

Satellite artist site for Amit Jung, deployed as its own Vercel project from
this monorepo. Next.js 16 + TypeScript. Content lives in `data/site.ts`.

## Local development

From the repo root:

```bash
pnpm install
pnpm --filter amit-jung-site dev     # http://localhost:3000
pnpm --filter amit-jung-site build
```

## Editing content

Everything is in `data/site.ts`:

- `bookingEmail` / `whatsapp` — where booking requests are routed.
- `bookedDates` — array of `YYYY-MM-DD` strings; add a date to block it on the
  calendar, remove to reopen. Redeploy (push) after editing.
- `slots`, `videos`, `tracks`, `works`, `stats`, `socials` — content sections.
- `lyanteUrl` / `lyanteEventsUrl` — cross-links back to lyante.art.

## Deploy (Vercel — one-time setup)

This repo hosts TWO Vercel projects:

| Project | Root Directory | Domain |
|---------|---------------|--------|
| lyante  | `.` (repo root) | `lyante.art` |
| amit    | `sites/amit`    | `amit.lyante.art` |

1. In Vercel, **Add New → Project**, import this same Git repository.
2. Set **Root Directory** = `sites/amit`. Framework preset: Next.js.
   (Vercel detects the pnpm workspace and installs from the repo root.)
3. Deploy. Then **Settings → Domains → Add** `amit.lyante.art`.
4. At the DNS provider for `lyante.art`, add the record Vercel shows —
   typically a `CNAME` for `amit` → `cname.vercel-dns.com`.
5. The existing `lyante.art` project is untouched.

## Cross-links

- amit.lyante.art links to lyante.art (nav, footer credit, booking CTA).
- lyante.art links to amit.lyante.art (footer "ARTISTS" column).
```

- [ ] **Step 2: Commit**

```bash
git add sites/amit/README.md
git commit -m "docs: amit site deploy + content README"
```

---

## Self-Review

**Spec coverage:**
- Monorepo structure (`sites/amit`, workspace) → Task 1. ✓
- Next 16 + TS port, keep globals.css/fonts → Task 2. ✓
- Cross-link CTAs both ways → Task 3 (amit→lyante) + Task 4 (lyante→amit). ✓
- Deploy & DNS documentation → Task 5. ✓
- Lyante at root unchanged except footer edit → only Task 4 touches `src/`. ✓

**Placeholder scan:** No TBD/TODO. `globals.css` "copy verbatim" is a precise instruction (file content is unchanged), not a placeholder. All code steps include full content.

**Type consistency:** `Site` interface defined in Task 2 Step 1; extended in Task 3 Step 1 with `lyanteUrl`/`lyanteEventsUrl` before they are consumed in Task 3 Steps 2–4. `Reveal` prop type matches usage in `page.tsx`. Package name `amit-jung-site` used consistently in all `pnpm --filter` commands.

**Scope:** Single implementation plan; no decomposition needed.
