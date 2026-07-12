# Lyante 3D Scroll Journey — Branding Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/branding` page as a continuous 3D concert-venue flythrough where scroll scrubs a cinematic camera path, with the page's 6 existing content sections appearing as DOM overlays at camera stops. The home page is NOT touched.

**Architecture:** A fixed full-viewport react-three-fiber `<Canvas>` renders a procedural stylized venue. A tall (600vh) scroll driver plus one GSAP ScrollTrigger (`scrub: 1`) maps native scroll to progress 0→1, which drives (a) the camera along keyframed paths defined in a pure, unit-tested `cameraPath.ts`, (b) progress-keyed scene events, and (c) overlay opacity via direct style writes (no per-frame React re-renders). Browsers without WebGL get the existing flat branding sections unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, `three` + `@react-three/fiber` + `@react-three/drei` (new), `gsap` ScrollTrigger (already installed), Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-30-3d-scroll-branding-design.md`

## Global Constraints

- Work in `/Users/redmen/Projects/event-tickets`. Package manager is **pnpm**.
- **Node 22 required:** the shell's default Node is v12. Every `pnpm`/`tsc`/node command must be prefixed in the SAME bash invocation: `source ~/.nvm/nvm.sh && nvm use 22 && <command>`. Shell state does not persist between tool calls.
- Palette (from `src/app/globals.css` `@theme`): gold `#C8922A`, gold-light `#F5C842`, gold-deep `#8B5E10`, bg `#080808`, ivory `#F0EDE6`, ash `#9A9590`. BrandBoard swatches: Ink `#0E1522`, Gold `#C8922A`, Bone `#E8E2D5`, Clay `#B4443C`, Sage `#6B8F71`.
- **Do NOT modify** `src/app/(marketing)/page.tsx` (home page) or any existing file in `src/components/marketing/sections/` — existing branding sections are the no-WebGL fallback. (Adding NEW files under `sections/branding/` is allowed where a task says so.)
- All other new code lives under `src/components/marketing/journey/`.
- `tsc --noEmit` clean and existing Vitest suite passing at the end of every task.
- Match the existing marketing components' code style (2-space indent, single quotes, no semicolons, Tailwind classes with the theme tokens like `text-ivory`, `bg-bg`, `font-cormorant`, `section-label`).

---

### Task 1: Install 3D dependencies

**Files:**
- Modify: `package.json` (via pnpm add)

**Interfaces:**
- Produces: `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` available for import in all later tasks.

- [ ] **Step 1: Install**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm add three @react-three/fiber @react-three/drei && pnpm add -D @types/three
```

Expected: exit 0, four packages added.

- [ ] **Step 2: Verify project still type-checks and tests pass**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec tsc --noEmit && pnpm exec vitest run
```

Expected: tsc silent; existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add three.js and react-three-fiber for 3D branding journey"
```

---

### Task 2: cameraPath.ts — beats, camera math, overlay windows (TDD)

**Files:**
- Create: `src/components/marketing/journey/cameraPath.ts`
- Test: `src/components/marketing/journey/cameraPath.test.ts`

**Interfaces:**
- Produces (exact, later tasks depend on these):
  - `type Vec3 = [number, number, number]`
  - `interface Beat { id: string; start: number; end: number }`
  - `const BEATS: Beat[]` — 6 beats, ids: `'hero' | 'coreServices' | 'brandBoard' | 'deliverables' | 'buildPhases' | 'cta'`, windows exactly `[0,.16] [.16,.33] [.33,.52] [.52,.70] [.70,.86] [.86,1]`
  - `interface CameraState { position: Vec3; lookAt: Vec3 }`
  - `getCameraState(progress: number): CameraState` — clamped to [0,1], continuous, finite
  - `beatLocalT(beatIndex: number, progress: number): number` — 0→1 within a beat's window, clamped outside
  - `overlayOpacity(beatIndex: number, progress: number): number` — 0 outside the beat, ramps 0→1 over localT .5→.62, holds 1 until .92, ramps back to 0 by 1.0

- [ ] **Step 1: Write the failing test**

```ts
// src/components/marketing/journey/cameraPath.test.ts
import { describe, expect, it } from 'vitest'
import { BEATS, beatLocalT, getCameraState, overlayOpacity } from './cameraPath'

describe('BEATS', () => {
  it('has 6 beats covering exactly 0..1 with contiguous windows', () => {
    expect(BEATS).toHaveLength(6)
    expect(BEATS[0].start).toBe(0)
    expect(BEATS[BEATS.length - 1].end).toBe(1)
    for (let i = 1; i < BEATS.length; i++) {
      expect(BEATS[i].start).toBe(BEATS[i - 1].end)
    }
  })

  it('uses the branding beat ids in order', () => {
    expect(BEATS.map((b) => b.id)).toEqual([
      'hero',
      'coreServices',
      'brandBoard',
      'deliverables',
      'buildPhases',
      'cta',
    ])
  })
})

describe('getCameraState', () => {
  it('returns finite vectors across the full progress range', () => {
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const { position, lookAt } = getCameraState(Math.min(p, 1))
      for (const v of [...position, ...lookAt]) {
        expect(Number.isFinite(v)).toBe(true)
      }
    }
  })

  it('is continuous at every beat boundary', () => {
    const eps = 0.0005
    for (const beat of BEATS.slice(1)) {
      const before = getCameraState(beat.start - eps)
      const after = getCameraState(beat.start + eps)
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs(after.position[axis] - before.position[axis])).toBeLessThan(0.5)
        expect(Math.abs(after.lookAt[axis] - before.lookAt[axis])).toBeLessThan(0.5)
      }
    }
  })

  it('clamps out-of-range progress', () => {
    expect(getCameraState(-1)).toEqual(getCameraState(0))
    expect(getCameraState(2)).toEqual(getCameraState(1))
  })
})

describe('beatLocalT', () => {
  it('maps a beat window to 0..1 and clamps outside it', () => {
    expect(beatLocalT(0, 0)).toBe(0)
    expect(beatLocalT(0, 0.08)).toBeCloseTo(0.5)
    expect(beatLocalT(0, 0.16)).toBe(1)
    expect(beatLocalT(0, 0.5)).toBe(1)
    expect(beatLocalT(3, 0)).toBe(0)
  })
})

describe('overlayOpacity', () => {
  it('is 0 outside the beat window', () => {
    expect(overlayOpacity(2, 0.1)).toBe(0)
    expect(overlayOpacity(2, 0.9)).toBe(0)
  })

  it('is fully visible during the dwell plateau and fades at the edges', () => {
    const beat = BEATS[2]
    const at = (localT: number) => beat.start + localT * (beat.end - beat.start)
    expect(overlayOpacity(2, at(0.2))).toBe(0)
    expect(overlayOpacity(2, at(0.75))).toBe(1)
    expect(overlayOpacity(2, at(0.56))).toBeGreaterThan(0)
    expect(overlayOpacity(2, at(0.56))).toBeLessThan(1)
    expect(overlayOpacity(2, at(1.0))).toBe(0)
  })

  it('overlays never exceed opacity 1 combined at any progress', () => {
    for (let p = 0; p <= 1.0001; p += 0.005) {
      let sum = 0
      for (let i = 0; i < BEATS.length; i++) sum += overlayOpacity(i, Math.min(p, 1))
      expect(sum).toBeLessThanOrEqual(1.0001)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run src/components/marketing/journey/cameraPath.test.ts
```

Expected: FAIL — module `./cameraPath` not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/components/marketing/journey/cameraPath.ts
// Pure scroll-progress math for the 3D branding journey. No three.js imports —
// keeps this unit-testable in plain Vitest.

export type Vec3 = [number, number, number]

export interface Beat {
  id: string
  start: number
  end: number
}

export const BEATS: Beat[] = [
  { id: 'hero', start: 0, end: 0.16 },
  { id: 'coreServices', start: 0.16, end: 0.33 },
  { id: 'brandBoard', start: 0.33, end: 0.52 },
  { id: 'deliverables', start: 0.52, end: 0.7 },
  { id: 'buildPhases', start: 0.7, end: 0.86 },
  { id: 'cta', start: 0.86, end: 1 },
]

export interface CameraState {
  position: Vec3
  lookAt: Vec3
}

// 7 keyframes: beat i travels keyframe[i] -> keyframe[i+1].
// Venue coordinates: stage centered at z=-8, brand panels around y≈6,
// trusses at y≈10, crowd on the floor in front of the stage.
interface Keyframe {
  position: Vec3
  lookAt: Vec3
}

const KEYFRAMES: Keyframe[] = [
  { position: [0, 26, 30], lookAt: [0, 2, -8] }, // K0 high above venue
  { position: [0, 14, 22], lookAt: [0, 3, -8] }, // K1 hero push-in done
  { position: [-10, 9, 4], lookAt: [0, 10, -8] }, // K2 at the trusses (core services)
  { position: [-6, 6, 0], lookAt: [6, 6, -6] }, // K3 among brand panels (brand board)
  { position: [10, 3, 2], lookAt: [-4, 2, -8] }, // K4 stage-edge dolly (deliverables)
  { position: [0, 10, 24], lookAt: [0, 3, -8] }, // K5 pulled back, crowd reveal (build phases)
  { position: [0, 20, 18], lookAt: [0, 1, -8] }, // K6 risen above venue (cta)
]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const smoothstep = (t: number) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

/** 0..1 within beat i's window, clamped outside it. */
export function beatLocalT(beatIndex: number, progress: number): number {
  const beat = BEATS[beatIndex]
  return clamp01((progress - beat.start) / (beat.end - beat.start))
}

// Camera travels during the first 60% of each beat, then dwells so the
// overlay has a stable reading window.
const TRAVEL_FRACTION = 0.6

export function getCameraState(progress: number): CameraState {
  const p = clamp01(progress)
  let beatIndex = BEATS.findIndex((b) => p >= b.start && p <= b.end)
  if (beatIndex === -1) beatIndex = p < 0.5 ? 0 : BEATS.length - 1

  const localT = beatLocalT(beatIndex, p)
  const travelT = smoothstep(localT / TRAVEL_FRACTION)

  const from = KEYFRAMES[beatIndex]
  const to = KEYFRAMES[beatIndex + 1]

  return {
    position: lerpVec3(from.position, to.position, travelT),
    lookAt: lerpVec3(from.lookAt, to.lookAt, travelT),
  }
}

// Overlay is readable during the dwell: fade in over localT .5->.62,
// hold at 1 until .92, fade out by 1.0.
export function overlayOpacity(beatIndex: number, progress: number): number {
  const beat = BEATS[beatIndex]
  const p = clamp01(progress)
  if (p < beat.start || p > beat.end) return 0
  const t = beatLocalT(beatIndex, p)
  if (t < 0.5) return 0
  if (t < 0.62) return smoothstep((t - 0.5) / 0.12)
  if (t <= 0.92) return 1
  return 1 - smoothstep((t - 0.92) / 0.08)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run
```

Expected: PASS — new tests green, full suite still green.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/journey/cameraPath.ts src/components/marketing/journey/cameraPath.test.ts
git commit -m "feat: add camera path math for 3D branding journey"
```

---

### Task 3: EventJourney scaffold — scroll driver, canvas, fallback, page swap

**Files:**
- Create: `src/components/marketing/journey/progressContext.ts`
- Create: `src/components/marketing/journey/Scene.tsx`
- Create: `src/components/marketing/journey/EventJourney.tsx`
- Create: `src/components/marketing/sections/branding/ClosingCta.tsx` (extracted verbatim from the page's inline CTA JSX)
- Modify: `src/app/(marketing)/branding/page.tsx`

**Interfaces:**
- Consumes: `getCameraState`, `BEATS`, `overlayOpacity` from `./cameraPath` (Task 2).
- Produces:
  - `ProgressContext` + `useProgress(): React.MutableRefObject<number>` from `progressContext.ts` — scene element components (Tasks 4–5) read `useProgress().current` inside `useFrame`.
  - `Scene` — no props; renders inside `<Canvas>`; camera rig applies `getCameraState` every frame.
  - `EventJourney` — props `{ overlays?: React.ReactNode[] }` (array indexed by beat; Task 6 fills it). Each overlay is wrapped in a fixed full-viewport div whose opacity EventJourney drives via `overlayOpacity`.
  - `ClosingCta` — the existing closing-CTA section markup as a reusable component (default export).

- [ ] **Step 1: Write `progressContext.ts`**

```ts
// src/components/marketing/journey/progressContext.ts
'use client'

import { createContext, useContext, type MutableRefObject } from 'react'

export const ProgressContext = createContext<MutableRefObject<number> | null>(null)

export function useProgress(): MutableRefObject<number> {
  const ref = useContext(ProgressContext)
  if (!ref) throw new Error('useProgress must be used inside EventJourney')
  return ref
}
```

- [ ] **Step 2: Write `Scene.tsx` (camera rig + atmosphere; venue elements arrive in Tasks 4–5)**

```tsx
// src/components/marketing/journey/Scene.tsx
'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { getCameraState } from './cameraPath'
import { useProgress } from './progressContext'

function CameraRig() {
  const progress = useProgress()
  const { camera } = useThree()
  const lookAtTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    const { position, lookAt } = getCameraState(progress.current)
    camera.position.set(position[0], position[1], position[2])
    lookAtTarget.current.set(lookAt[0], lookAt[1], lookAt[2])
    camera.lookAt(lookAtTarget.current)
  })

  return null
}

export function Scene() {
  return (
    <>
      <color attach="background" args={['#080808']} />
      <fog attach="fog" args={['#080808', 12, 55]} />
      <ambientLight intensity={0.15} />
      <CameraRig />
      {/* Venue elements (Stage, Trusses, SpotBeams, CrowdParticles, BrandPanels)
          are added in Tasks 4 and 5. */}
    </>
  )
}
```

- [ ] **Step 3: Extract `ClosingCta.tsx`**

Create `src/components/marketing/sections/branding/ClosingCta.tsx` containing exactly the current closing-CTA `<section>` JSX from `src/app/(marketing)/branding/page.tsx` (the block starting `{/* Closing CTA */}` through its closing `</section>`), wrapped as:

```tsx
import Link from 'next/link'
import Button from '@/components/marketing/ui/Button'

export default function ClosingCta() {
  return (
    /* paste the existing <section>…</section> JSX verbatim from the page — read the page file first */
  )
}
```

Copy the JSX exactly — do not restyle it.

- [ ] **Step 4: Write `EventJourney.tsx`**

```tsx
// src/components/marketing/journey/EventJourney.tsx
'use client'

import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { BEATS, overlayOpacity } from './cameraPath'
import { ProgressContext } from './progressContext'
import { Scene } from './Scene'

import BrandingHero from '@/components/marketing/sections/branding/BrandingHero'
import CoreServices from '@/components/marketing/sections/branding/CoreServices'
import BrandBoard from '@/components/marketing/sections/branding/BrandBoard'
import BrandingDeliverables from '@/components/marketing/sections/branding/BrandingDeliverables'
import BrandBuildPhases from '@/components/marketing/sections/branding/BrandBuildPhases'
import ClosingCta from '@/components/marketing/sections/branding/ClosingCta'

gsap.registerPlugin(ScrollTrigger)

const SCROLL_VH_PER_BEAT = 100

function FlatFallback() {
  return (
    <>
      <BrandingHero />
      <CoreServices />
      <BrandBoard />
      <BrandingDeliverables />
      <BrandBuildPhases />
      <ClosingCta />
    </>
  )
}

class CanvasErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function supportsWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function EventJourney({ overlays = [] }: { overlays?: ReactNode[] }) {
  // null = not yet checked (SSR/first paint), then true/false after mount.
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const progressRef = useRef(0)
  const driverRef = useRef<HTMLDivElement>(null)
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setWebgl(supportsWebgl())
  }, [])

  useEffect(() => {
    if (!webgl || !driverRef.current) return
    const trigger = ScrollTrigger.create({
      trigger: driverRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        progressRef.current = self.progress
        overlayRefs.current.forEach((el, i) => {
          if (!el) return
          const o = overlayOpacity(i, self.progress)
          el.style.opacity = String(o)
          el.style.visibility = o === 0 ? 'hidden' : 'visible'
          el.style.transform = `translateY(${(1 - o) * 24}px)`
        })
      },
    })
    return () => trigger.kill()
  }, [webgl])

  if (webgl === null) {
    return <div style={{ height: '100vh', backgroundColor: '#080808' }} />
  }
  if (!webgl) return <FlatFallback />

  return (
    <ProgressContext.Provider value={progressRef}>
      <div ref={driverRef} style={{ height: `${BEATS.length * SCROLL_VH_PER_BEAT}vh` }}>
        <div className="fixed inset-0">
          <CanvasErrorBoundary fallback={<FlatFallback />}>
            <Canvas
              dpr={[1, 2]}
              camera={{ fov: 55, near: 0.1, far: 120, position: [0, 26, 30] }}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
              <Scene />
            </Canvas>
          </CanvasErrorBoundary>
        </div>
        {overlays.map((overlay, i) => (
          <div
            key={BEATS[i]?.id ?? i}
            ref={(el) => {
              overlayRefs.current[i] = el
            }}
            className="fixed inset-0 pointer-events-none flex items-center justify-center"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            {overlay}
          </div>
        ))}
      </div>
    </ProgressContext.Provider>
  )
}
```

Note: overlays use `pointer-events-none` on the wrapper; interactive overlay content (links/buttons in Task 6) re-enables with `pointer-events-auto` on itself.

- [ ] **Step 5: Swap the branding page**

Replace the contents of `src/app/(marketing)/branding/page.tsx` with (keeping the metadata export — the page stays a server component):

```tsx
import EventJourney from '@/components/marketing/journey/EventJourney'

export const metadata = {
  title: 'Branding — Lyante Production',
  description:
    'Full-service brand building — strategy, identity, color, typography, brand boards, websites, social media, local SEO, content, paid ads and sustainable marketing.',
}

export default function BrandingPage() {
  return <EventJourney />
}
```

(Overlays are added to this call in Task 6. Do NOT touch `src/app/(marketing)/page.tsx` — the home page keeps its current flat sections.)

- [ ] **Step 6: Verify**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec tsc --noEmit && pnpm exec vitest run
```

Expected: clean tsc, all tests pass. Then boot the dev server briefly and confirm `/branding` compiles (dark viewport with fog; camera moves on scroll):

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && timeout 40 pnpm dev || true
```

Expected: "Ready" message, no compile errors. (Full visual verification happens in Task 7.)

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing/journey/progressContext.ts src/components/marketing/journey/Scene.tsx src/components/marketing/journey/EventJourney.tsx src/components/marketing/sections/branding/ClosingCta.tsx "src/app/(marketing)/branding/page.tsx"
git commit -m "feat: add EventJourney scaffold on /branding with scroll-scrubbed camera and WebGL fallback"
```

---

### Task 4: Venue elements A — Stage, Trusses, SpotBeams

**Files:**
- Create: `src/components/marketing/journey/scene/Stage.tsx`
- Create: `src/components/marketing/journey/scene/Trusses.tsx`
- Create: `src/components/marketing/journey/scene/SpotBeams.tsx`
- Modify: `src/components/marketing/journey/Scene.tsx` (render the three new elements)

**Interfaces:**
- Consumes: `useProgress()` from `../progressContext`; `beatLocalT` from `../cameraPath`.
- Produces: `<Stage />`, `<Trusses />`, `<SpotBeams />` — no props.
- Beat indices used by SpotBeams: **1** (coreServices: beams sweep on), **3** (deliverables: 4 pools ignite), **5** (cta: dim all but center pair).

- [ ] **Step 1: Write `scene/Stage.tsx`**

```tsx
// src/components/marketing/journey/scene/Stage.tsx
'use client'

export function Stage() {
  return (
    <group position={[0, 0, -8]}>
      {/* platform */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[18, 1, 8]} />
        <meshStandardMaterial color="#141414" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* gold edge strip */}
      <mesh position={[0, 1.02, 4.01]}>
        <boxGeometry args={[18, 0.06, 0.06]} />
        <meshStandardMaterial color="#C8922A" emissive="#C8922A" emissiveIntensity={2} />
      </mesh>
      {/* backdrop */}
      <mesh position={[0, 5, -4]}>
        <boxGeometry args={[18, 9, 0.3]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.9} />
      </mesh>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 12]}>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.2} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Write `scene/Trusses.tsx`**

```tsx
// src/components/marketing/journey/scene/Trusses.tsx
'use client'

const BAR = { color: '#1c1c1c', roughness: 0.5, metalness: 0.8 }

function TrussBar({
  position,
  size,
}: {
  position: [number, number, number]
  size: [number, number, number]
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial {...BAR} />
    </mesh>
  )
}

export function Trusses() {
  return (
    <group position={[0, 10, -8]}>
      {/* two long horizontal trusses over the stage */}
      <TrussBar position={[0, 0, 0]} size={[20, 0.3, 0.3]} />
      <TrussBar position={[0, 0, 4]} size={[20, 0.3, 0.3]} />
      {/* cross braces */}
      {[-8, -4, 0, 4, 8].map((x) => (
        <TrussBar key={x} position={[x, 0, 2]} size={[0.25, 0.25, 4]} />
      ))}
      {/* vertical supports down to the stage */}
      {[-9.5, 9.5].map((x) => (
        <TrussBar key={x} position={[x, -4.5, 2]} size={[0.3, 9, 0.3]} />
      ))}
    </group>
  )
}
```

- [ ] **Step 3: Write `scene/SpotBeams.tsx`**

Six beams hang from the trusses. During the **coreServices** beat (index 1) they sweep on one-by-one; during the **deliverables** beat (index 3) the first four brighten sequentially as "spotlight pools"; during the **cta** beat (index 5) all but the center pair fade out. Beams are additive-blended cones (fake volumetrics).

```tsx
// src/components/marketing/journey/scene/SpotBeams.tsx
'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const BEAM_XS = [-8, -4.8, -1.6, 1.6, 4.8, 8]
const BEAM_HEIGHT = 9
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function SpotBeams() {
  const progress = useProgress()
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  useFrame(() => {
    const p = progress.current
    const servicesT = beatLocalT(1, p)
    const deliverablesT = beatLocalT(3, p)
    const ctaT = beatLocalT(5, p)

    BEAM_XS.forEach((_, i) => {
      const mat = materials.current[i]
      if (!mat) return
      // core services: beam i ignites when the sweep passes its slot
      const ignite = clamp01(servicesT * BEAM_XS.length - i)
      let intensity = 0.28 * ignite
      // deliverables: first 4 beams pulse up sequentially
      if (i < 4) {
        const pool = clamp01(deliverablesT * 4 - i)
        intensity = Math.max(intensity, 0.45 * pool)
      }
      // cta: dim everything except the center pair
      if (ctaT > 0 && i !== 2 && i !== 3) {
        intensity *= 1 - ctaT
      }
      mat.opacity = intensity
    })
  })

  return (
    <group position={[0, 10, -6]}>
      {BEAM_XS.map((x, i) => (
        <mesh key={x} position={[x, -BEAM_HEIGHT / 2, 0]}>
          <coneGeometry args={[2.2, BEAM_HEIGHT, 24, 1, true]} />
          <meshBasicMaterial
            ref={(m) => {
              materials.current[i] = m
            }}
            color="#F5C842"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 4: Render them in `Scene.tsx`**

In `src/components/marketing/journey/Scene.tsx`, add imports and render inside the fragment (replacing the placeholder comment):

```tsx
import { Stage } from './scene/Stage'
import { Trusses } from './scene/Trusses'
import { SpotBeams } from './scene/SpotBeams'
```

```tsx
      <CameraRig />
      <Stage />
      <Trusses />
      <SpotBeams />
```

- [ ] **Step 5: Verify**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec tsc --noEmit && pnpm exec vitest run
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/journey/scene/Stage.tsx src/components/marketing/journey/scene/Trusses.tsx src/components/marketing/journey/scene/SpotBeams.tsx src/components/marketing/journey/Scene.tsx
git commit -m "feat: add stage, trusses, and progress-driven spotlight beams"
```

---

### Task 5: Venue elements B — CrowdParticles, BrandPanels

**Files:**
- Create: `src/components/marketing/journey/scene/CrowdParticles.tsx`
- Create: `src/components/marketing/journey/scene/BrandPanels.tsx`
- Modify: `src/components/marketing/journey/Scene.tsx` (render the two new elements)

**Interfaces:**
- Consumes: `useProgress()`, `beatLocalT` (same as Task 4).
- Produces: `<CrowdParticles />`, `<BrandPanels />` — no props.
- Beat indices used: CrowdParticles brightens during **buildPhases** (index 4) in 4 waves; BrandPanels light up during **brandBoard** (index 2).

- [ ] **Step 1: Write `scene/CrowdParticles.tsx`**

~2,000 instanced glowing dots in front of the stage, gentle sway; they brighten in 4 sequential waves during the **buildPhases** beat (one wave per phase: Discover → Design → Deploy → Amplify), grouped by z-depth rows.

```tsx
// src/components/marketing/journey/scene/CrowdParticles.tsx
'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const COUNT = 2000
const dummy = new THREE.Object3D()
const color = new THREE.Color()
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function CrowdParticles() {
  const progress = useProgress()
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Deterministic pseudo-random layout (seeded by index) in the crowd area.
  const seeds = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
      const r2 = Math.abs(Math.sin(i * 78.233) * 12578.1459) % 1
      const r3 = Math.abs(Math.sin(i * 3.7) * 2751.3) % 1
      return {
        x: (r1 - 0.5) * 34,
        z: r2 * 22,
        y: 1.4 + r3 * 0.5,
        phase: r1 * Math.PI * 2,
        // wave 0..3 by depth row: nearest-to-stage quarter is wave 0
        wave: Math.min(3, Math.floor(r2 * 4)),
      }
    })
  }, [])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = clock.getElapsedTime()
    const phasesT = beatLocalT(4, progress.current)

    seeds.forEach((s, i) => {
      dummy.position.set(s.x, s.y + Math.sin(t * 1.4 + s.phase) * 0.12, s.z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      // brighten wave-by-wave during buildPhases
      const lit = clamp01(phasesT * 4 - s.wave)
      const brightness = 0.35 + lit * 0.65
      color.set('#F5C842').multiplyScalar(brightness)
      mesh.setColorAt(i, color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[0.07, 6, 6]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
```

- [ ] **Step 2: Write `scene/BrandPanels.tsx`**

Six floating framed panels hung around the brand-board camera path (K3 area): the 5 BrandBoard color swatches (Ink `#0E1522`, Gold `#C8922A`, Bone `#E8E2D5`, Clay `#B4443C`, Sage `#6B8F71`) plus one dark "typography" panel with a gold rule. Panels light up sequentially during the **brandBoard** beat (index 2). Fully procedural — no textures.

```tsx
// src/components/marketing/journey/scene/BrandPanels.tsx
'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const PANELS: {
  color: string
  position: [number, number, number]
  rotationY: number
}[] = [
  { color: '#0E1522', position: [-8, 6, -2], rotationY: Math.PI / 5 },
  { color: '#C8922A', position: [-4, 6.5, -6], rotationY: Math.PI / 10 },
  { color: '#E8E2D5', position: [0, 6, -3], rotationY: 0 },
  { color: '#B4443C', position: [4, 6.5, -6], rotationY: -Math.PI / 10 },
  { color: '#6B8F71', position: [8, 6, -2], rotationY: -Math.PI / 5 },
  { color: '#111111', position: [0, 7.5, 2], rotationY: Math.PI }, // typography panel
]

export function BrandPanels() {
  const progress = useProgress()
  const materials = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  useFrame(() => {
    const boardT = beatLocalT(2, progress.current)
    materials.current.forEach((mat, i) => {
      if (!mat) return
      // panels light up sequentially as the beat advances
      const lit = clamp01(boardT * PANELS.length - i * 0.7)
      mat.emissiveIntensity = 0.05 + lit * 0.9
    })
  })

  return (
    <group>
      {PANELS.map((panel, i) => (
        <group key={i} position={panel.position} rotation={[0, panel.rotationY, 0]}>
          {/* gold frame */}
          <mesh position={[0, 0, -0.03]}>
            <boxGeometry args={[3.4, 2.2, 0.05]} />
            <meshStandardMaterial color="#C8922A" emissive="#8B5E10" emissiveIntensity={0.4} />
          </mesh>
          {/* swatch face */}
          <mesh>
            <planeGeometry args={[3.2, 2]} />
            <meshStandardMaterial
              ref={(m) => {
                materials.current[i] = m
              }}
              color={panel.color}
              emissive={panel.color}
              emissiveIntensity={0.05}
              roughness={0.6}
            />
          </mesh>
          {/* gold rule on the typography panel */}
          {i === PANELS.length - 1 && (
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[2.4, 0.08]} />
              <meshStandardMaterial color="#C8922A" emissive="#C8922A" emissiveIntensity={1.2} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}
```

- [ ] **Step 3: Render them in `Scene.tsx`**

Add imports and render:

```tsx
import { CrowdParticles } from './scene/CrowdParticles'
import { BrandPanels } from './scene/BrandPanels'
```

```tsx
      <CameraRig />
      <Stage />
      <Trusses />
      <SpotBeams />
      <CrowdParticles />
      <BrandPanels />
```

- [ ] **Step 4: Verify**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec tsc --noEmit && pnpm exec vitest run
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/journey/scene/CrowdParticles.tsx src/components/marketing/journey/scene/BrandPanels.tsx src/components/marketing/journey/Scene.tsx
git commit -m "feat: add crowd particles and brand-board panels"
```

---

### Task 6: Overlays — 6 beat overlays wired into the journey

**Files:**
- Create: `src/components/marketing/journey/overlays/OverlayShell.tsx`
- Create: `src/components/marketing/journey/overlays/HeroOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/CoreServicesOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/BrandBoardOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/DeliverablesOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/BuildPhasesOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/CtaOverlay.tsx`
- Modify: `src/app/(marketing)/branding/page.tsx` (pass overlays)

**Interfaces:**
- Consumes: `EventJourney`'s `overlays?: ReactNode[]` prop (Task 3) — array order MUST match `BEATS` order: hero, coreServices, brandBoard, deliverables, buildPhases, cta.
- Copy source: reuse headline/card/phase text **verbatim** from the corresponding files in `src/components/marketing/sections/branding/` (read each before writing its overlay). Do not modify those files.

- [ ] **Step 1: Write the shared shell**

```tsx
// src/components/marketing/journey/overlays/OverlayShell.tsx
// Shared scrim + typography container for journey overlays.

export function OverlayShell({
  label,
  children,
  wide = false,
}: {
  label?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`mx-auto px-6 py-10 rounded-2xl ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}
      style={{ backgroundColor: 'rgba(8,8,8,0.55)', backdropFilter: 'blur(6px)' }}
    >
      {label && <p className="section-label mb-4">{label}</p>}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Write the 6 overlays**

Each overlay is a thin presentational component. Pull copy verbatim from the matching section file (read it first). Concrete requirements per overlay:

- `HeroOverlay` — the BrandingHero headline and tagline copy from `sections/branding/BrandingHero.tsx` (uses `section-label` "CREATIVE & BRANDING" and the `font-cormorant` headline). No shell scrim — floats directly over the scene, center-screen, large type (`font-cormorant font-bold text-ivory`, `style={{ fontSize: 'var(--t-display)' }}`).
- `CoreServicesOverlay` — `OverlayShell wide` + `label="CORE SERVICES"`; a stacking `md:grid-cols-3` grid of the 3 services from `sections/branding/CoreServices.tsx` (label + title + first descriptive line each: CONTENT CREATION / SOCIAL MEDIA MANAGEMENT / WEBSITE BUILDING).
- `BrandBoardOverlay` — `OverlayShell` + `label="THE BRAND BOARD"`; the section heading copy from `sections/branding/BrandBoard.tsx`, plus a compact row of the 5 swatch names + hexes (Ink, Gold, Bone, Clay, Sage — render each as a small colored square + name) and the 3 type faces (Display · Cormorant, Impact · Bebas Neue, Body · DM Sans) — the 3D panels behind carry the visual weight, keep this text-light.
- `DeliverablesOverlay` — `OverlayShell wide` + `label="WHAT YOU GET"`; the deliverables list from `sections/branding/BrandingDeliverables.tsx` (read the file; render its items as a 2-column checklist with gold ✓ markers).
- `BuildPhasesOverlay` — `OverlayShell wide` + `label="HOW WE BUILD"`; the 4 phases verbatim from `sections/branding/BrandBuildPhases.tsx`: 01 DISCOVER / 02 DESIGN / 03 DEPLOY / 04 AMPLIFY with their body copy, in a `grid-cols-2 md:grid-cols-4` row.
- `CtaOverlay` — `OverlayShell` + `label="LET'S BUILD"`; heading "Ready to become unforgettable?" + the supporting line ("Tell us about your brand and where you want it to go. We'll show you exactly how we'd get you there."), and the two buttons (reuse `@/components/marketing/ui/Button`: `href="/contact" variant="gold"` "BRIEF US →" and `href="/work" variant="outline"` "SEE OUR WORK") wrapped in a div with `pointer-events-auto`.

Styling: `text-ivory` body, `text-ash` secondary, gold accents, existing utility classes (`section-label`, `font-cormorant`) so typography matches the site.

- [ ] **Step 3: Pass overlays from the page**

Replace `src/app/(marketing)/branding/page.tsx` contents with:

```tsx
import EventJourney from '@/components/marketing/journey/EventJourney'
import { HeroOverlay } from '@/components/marketing/journey/overlays/HeroOverlay'
import { CoreServicesOverlay } from '@/components/marketing/journey/overlays/CoreServicesOverlay'
import { BrandBoardOverlay } from '@/components/marketing/journey/overlays/BrandBoardOverlay'
import { DeliverablesOverlay } from '@/components/marketing/journey/overlays/DeliverablesOverlay'
import { BuildPhasesOverlay } from '@/components/marketing/journey/overlays/BuildPhasesOverlay'
import { CtaOverlay } from '@/components/marketing/journey/overlays/CtaOverlay'

export const metadata = {
  title: 'Branding — Lyante Production',
  description:
    'Full-service brand building — strategy, identity, color, typography, brand boards, websites, social media, local SEO, content, paid ads and sustainable marketing.',
}

export default function BrandingPage() {
  return (
    <EventJourney
      overlays={[
        <HeroOverlay key="hero" />,
        <CoreServicesOverlay key="coreServices" />,
        <BrandBoardOverlay key="brandBoard" />,
        <DeliverablesOverlay key="deliverables" />,
        <BuildPhasesOverlay key="buildPhases" />,
        <CtaOverlay key="cta" />,
      ]}
    />
  )
}
```

- [ ] **Step 4: Verify**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec tsc --noEmit && pnpm exec vitest run
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/journey/overlays/ "src/app/(marketing)/branding/page.tsx"
git commit -m "feat: add journey overlays for all six branding beats"
```

---

### Task 7: End-to-end verification — build, dev-server smoke, visual check

**Files:** none (verification only; small fixes allowed if the build surfaces errors)

- [ ] **Step 1: Full test suite + type-check**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec tsc --noEmit && pnpm exec vitest run
```

Expected: clean / all pass.

- [ ] **Step 2: Production build**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec next build
```

Note: `pnpm run build` runs prisma migrate first (needs the DB); `pnpm exec next build` skips that. If `next build` fails on prisma generate, run `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec prisma generate` first. Expected: build succeeds; `/branding` compiles without prerender errors (`supportsWebgl()` is only called inside `useEffect`, so SSR never touches `document`). Also confirm `/` (home) still builds unchanged.

- [ ] **Step 3: Dev-server visual smoke test**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm dev
```

Open `http://localhost:3000/branding` in the in-app browser and verify, scrolling top to bottom:
1. Beat 1: high aerial view of dark venue, camera pushes in, branding hero overlay fades in during the dwell.
2. Beat 2: beams sweep on left-to-right while the core-services overlay is readable.
3. Beat 3: brand panels (5 swatches + type panel) light up sequentially as the camera weaves past.
4. Beat 4: spotlight pools ignite along the stage edge behind the deliverables checklist.
5. Beat 5: crowd brightens in 4 waves behind the build-phases overlay.
6. Beat 6: lights dim to the center pair; CTA overlay with working "BRIEF US" / "SEE OUR WORK" buttons (hover/click works despite `pointer-events-none` wrapper).
7. `http://localhost:3000/` (home) is unchanged — flat sections, no canvas.
8. No console errors; scrolling is smooth.

Fix anything broken (small tweaks to positions/opacity windows are expected tuning, not plan deviations). Stop the dev server when done.

- [ ] **Step 4: Commit any tuning fixes**

```bash
cd /Users/redmen/Projects/event-tickets
git add -A
git commit -m "polish: tune 3D branding journey timings after visual verification" --allow-empty
```

---

## Manual review (not automatable)

After Task 7, a human should scroll `/branding` end-to-end and judge:
- Does each dwell give enough reading time at a natural scroll pace?
- Do overlays collide visually with bright scene elements behind them?
- Do the brand panels read as a "brand board" or do they need the overlay copy to land first?
- Mobile feel (user explicitly chose full-quality 3D everywhere — check on a real phone).

Tuning knobs, all one-line changes: `KEYFRAMES` in `cameraPath.ts`, `TRAVEL_FRACTION`, overlay ramp constants in `overlayOpacity`, `SCROLL_VH_PER_BEAT` in `EventJourney.tsx`.
