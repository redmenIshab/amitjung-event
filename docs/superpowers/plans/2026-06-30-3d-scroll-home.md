# Lyante 3D Scroll Journey Home Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Lyante home page as a continuous 3D concert-venue flythrough where scroll scrubs a cinematic camera path, with the 8 existing content sections appearing as DOM overlays at camera stops.

**Architecture:** A fixed full-viewport react-three-fiber `<Canvas>` renders a procedural stylized venue. A tall (800vh) scroll driver plus one GSAP ScrollTrigger (`scrub: 1`) maps native scroll to progress 0→1, which drives (a) the camera along keyframed paths defined in a pure, unit-tested `cameraPath.ts`, (b) progress-keyed scene events, and (c) overlay opacity via direct style writes (no per-frame React re-renders). Browsers without WebGL get the existing flat sections unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, `three` + `@react-three/fiber` + `@react-three/drei` (new), `gsap` ScrollTrigger (already installed), Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-30-3d-scroll-home-design.md`

## Global Constraints

- Work in `/Users/redmen/Projects/event-tickets`. Package manager is **pnpm**.
- **Node 22 required:** the shell's default Node is v12. Every `pnpm`/`tsc`/node command must be prefixed in the SAME bash invocation: `source ~/.nvm/nvm.sh && nvm use 22 && <command>`. Shell state does not persist between tool calls.
- Palette (from `src/app/globals.css` `@theme`): gold `#C8922A`, gold-light `#F5C842`, gold-deep `#8B5E10`, bg `#080808`, ivory `#F0EDE6`, ash `#9A9590`.
- Existing marketing section components in `src/components/marketing/sections/` must NOT be modified — they are the no-WebGL fallback.
- All new code lives under `src/components/marketing/journey/`.
- `tsc --noEmit` clean and existing Vitest suite passing at the end of every task.
- Prettier: 2-space indent, single quotes, no semicolons is NOT the convention here — match the existing marketing components' style (2-space, single quotes, semicolons omitted as in `page.tsx`). Follow whatever `pnpm exec prettier --check` accepts.

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
git commit -m "chore: add three.js and react-three-fiber for 3D home journey"
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
  - `const BEATS: Beat[]` — 8 beats, ids: `'hero' | 'manifesto' | 'services' | 'process' | 'ticketing' | 'portfolio' | 'testimonials' | 'contact'`, windows exactly `[0,.12] [.12,.24] [.24,.36] [.36,.48] [.48,.62] [.62,.78] [.78,.88] [.88,1]`
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
  it('has 8 beats covering exactly 0..1 with contiguous windows', () => {
    expect(BEATS).toHaveLength(8)
    expect(BEATS[0].start).toBe(0)
    expect(BEATS[BEATS.length - 1].end).toBe(1)
    for (let i = 1; i < BEATS.length; i++) {
      expect(BEATS[i].start).toBe(BEATS[i - 1].end)
    }
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

  it('is continuous at every beat boundary (no jump larger than one smooth step)', () => {
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
    expect(beatLocalT(0, 0.06)).toBeCloseTo(0.5)
    expect(beatLocalT(0, 0.12)).toBe(1)
    expect(beatLocalT(0, 0.5)).toBe(1)
    expect(beatLocalT(3, 0)).toBe(0)
  })
})

describe('overlayOpacity', () => {
  it('is 0 outside the beat window', () => {
    expect(overlayOpacity(2, 0.1)).toBe(0)
    expect(overlayOpacity(2, 0.5)).toBe(0)
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

  it('adjacent overlays never exceed opacity 1 combined at any progress', () => {
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
// Pure scroll-progress math for the 3D home journey. No three.js imports —
// keeps this unit-testable in plain Vitest.

export type Vec3 = [number, number, number]

export interface Beat {
  id: string
  start: number
  end: number
}

export const BEATS: Beat[] = [
  { id: 'hero', start: 0, end: 0.12 },
  { id: 'manifesto', start: 0.12, end: 0.24 },
  { id: 'services', start: 0.24, end: 0.36 },
  { id: 'process', start: 0.36, end: 0.48 },
  { id: 'ticketing', start: 0.48, end: 0.62 },
  { id: 'portfolio', start: 0.62, end: 0.78 },
  { id: 'testimonials', start: 0.78, end: 0.88 },
  { id: 'contact', start: 0.88, end: 1 },
]

export interface CameraState {
  position: Vec3
  lookAt: Vec3
}

// 9 keyframes: beat i travels keyframe[i] -> keyframe[i+1].
// Venue coordinates: stage centered at z=-8, entrance/QR portal at +z,
// trusses at y≈10, LED screens at y≈6.
interface Keyframe {
  position: Vec3
  lookAt: Vec3
}

const KEYFRAMES: Keyframe[] = [
  { position: [0, 26, 30], lookAt: [0, 2, -8] }, // K0 high above venue
  { position: [0, 14, 22], lookAt: [0, 3, -8] }, // K1 hero push-in done
  { position: [0, 4, 14], lookAt: [0, 4, -8] }, // K2 facing stage (manifesto)
  { position: [-10, 9, 4], lookAt: [0, 10, -8] }, // K3 at the trusses (services)
  { position: [10, 3, 2], lookAt: [-4, 2, -8] }, // K4 stage-edge dolly (process)
  { position: [0, 4, 16], lookAt: [0, 4, 24] }, // K5 facing entrance / QR portal (ticketing)
  { position: [-6, 6, 0], lookAt: [6, 6, -6] }, // K6 among LED screens (portfolio)
  { position: [0, 10, 24], lookAt: [0, 3, -8] }, // K7 pulled back, crowd reveal (testimonials)
  { position: [0, 20, 18], lookAt: [0, 1, -8] }, // K8 risen above venue (contact)
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
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run src/components/marketing/journey/cameraPath.test.ts
```

Expected: PASS — all tests green. Also run the full suite once (`pnpm exec vitest run`) to confirm nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/journey/cameraPath.ts src/components/marketing/journey/cameraPath.test.ts
git commit -m "feat: add camera path math for 3D home journey"
```

---

### Task 3: EventJourney scaffold — scroll driver, canvas, fallback, page swap

**Files:**
- Create: `src/components/marketing/journey/progressContext.ts`
- Create: `src/components/marketing/journey/Scene.tsx`
- Create: `src/components/marketing/journey/EventJourney.tsx`
- Modify: `src/app/(marketing)/page.tsx`

**Interfaces:**
- Consumes: `getCameraState`, `BEATS`, `overlayOpacity` from `./cameraPath` (Task 2).
- Produces:
  - `ProgressContext: React.Context<React.MutableRefObject<number>>` and hook `useProgress(): React.MutableRefObject<number>` from `progressContext.ts` — scene element components (Tasks 4–5) read `useProgress().current` inside `useFrame`.
  - `Scene` accepts no props; renders inside `<Canvas>`; contains the camera rig that applies `getCameraState` every frame.
  - `EventJourney` accepts an `overlays?: React.ReactNode[]` prop (array indexed by beat; Task 6 fills it). Each overlay node is wrapped in a full-viewport fixed div whose opacity EventJourney drives via `overlayOpacity`.

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
      {/* Venue elements (Stage, Trusses, SpotBeams, CrowdParticles, LedScreens, QrPortal)
          are added in Tasks 4 and 5. */}
    </>
  )
}
```

- [ ] **Step 3: Write `EventJourney.tsx`**

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

import Hero from '@/components/marketing/sections/Hero'
import Manifesto from '@/components/marketing/sections/Manifesto'
import Services from '@/components/marketing/sections/Services'
import ProcessTimeline from '@/components/marketing/sections/ProcessTimeline'
import TicketingCallout from '@/components/marketing/sections/TicketingCallout'
import Portfolio from '@/components/marketing/sections/Portfolio'
import Testimonials from '@/components/marketing/sections/Testimonials'
import Contact from '@/components/marketing/sections/Contact'

gsap.registerPlugin(ScrollTrigger)

const SCROLL_VH_PER_BEAT = 100

function FlatFallback() {
  return (
    <>
      <Hero />
      <Manifesto />
      <Services />
      <ProcessTimeline />
      <TicketingCallout />
      <Portfolio />
      <Testimonials />
      <Contact />
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

- [ ] **Step 4: Swap the home page**

Replace the full contents of `src/app/(marketing)/page.tsx` with:

```tsx
import EventJourney from '@/components/marketing/journey/EventJourney'

export default function Home() {
  return <EventJourney />
}
```

(Overlays are added to this call in Task 6.)

- [ ] **Step 5: Verify**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec tsc --noEmit && pnpm exec vitest run
```

Expected: clean tsc, all tests pass. Then boot the dev server briefly and confirm the page compiles and renders (a dark viewport with fog; camera moves on scroll):

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && timeout 40 pnpm dev || true
```

Expected: "Ready" message, no compile errors for `/`. (Full visual verification happens in Task 7.)

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/journey/progressContext.ts src/components/marketing/journey/Scene.tsx src/components/marketing/journey/EventJourney.tsx "src/app/(marketing)/page.tsx"
git commit -m "feat: add EventJourney scaffold with scroll-scrubbed camera and WebGL fallback"
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

Six beams hang from the trusses. During the **services** beat (index 2) they sweep on one-by-one; during the **process** beat (index 3) the first four brighten sequentially as the "spotlight pools". During the **contact** beat (index 7) all but the center pair fade out. Beams are additive-blended cones (fake volumetrics).

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
    const servicesT = beatLocalT(2, p)
    const processT = beatLocalT(3, p)
    const contactT = beatLocalT(7, p)

    BEAM_XS.forEach((_, i) => {
      const mat = materials.current[i]
      if (!mat) return
      // services: beam i ignites when the sweep passes its slot
      const ignite = clamp01(servicesT * BEAM_XS.length - i)
      let intensity = 0.28 * ignite
      // process: first 4 beams pulse up sequentially
      if (i < 4) {
        const pool = clamp01(processT * 4 - i)
        intensity = Math.max(intensity, 0.45 * pool)
      }
      // contact: dim everything except the center pair
      if (contactT > 0 && i !== 2 && i !== 3) {
        intensity *= 1 - contactT
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

### Task 5: Venue elements B — CrowdParticles, LedScreens, QrPortal

**Files:**
- Create: `src/components/marketing/journey/scene/CrowdParticles.tsx`
- Create: `src/components/marketing/journey/scene/LedScreens.tsx`
- Create: `src/components/marketing/journey/scene/QrPortal.tsx`
- Modify: `src/components/marketing/journey/Scene.tsx` (render the three new elements)

**Interfaces:**
- Consumes: `useProgress()`, `beatLocalT` (same as Task 4).
- Produces: `<CrowdParticles />`, `<LedScreens />`, `<QrPortal />` — no props.

- [ ] **Step 1: Write `scene/CrowdParticles.tsx`**

~2,000 instanced glowing dots in front of the stage, gentle sway; they brighten in waves during the **testimonials** beat (index 6).

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

export function CrowdParticles() {
  const progress = useProgress()
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  // Deterministic pseudo-random layout (seeded by index) in the crowd area.
  const seeds = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
      const r2 = Math.abs(Math.sin(i * 78.233) * 12578.1459) % 1
      const r3 = Math.abs(Math.sin(i * 3.7) * 2751.3) % 1
      return {
        x: (r1 - 0.5) * 34,
        z: 0 + r2 * 22,
        y: 1.4 + r3 * 0.5,
        phase: r1 * Math.PI * 2,
      }
    })
  }, [])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = clock.getElapsedTime()
    seeds.forEach((s, i) => {
      dummy.position.set(s.x, s.y + Math.sin(t * 1.4 + s.phase) * 0.12, s.z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true

    const testimonialsT = beatLocalT(6, progress.current)
    if (matRef.current) {
      matRef.current.opacity = 0.35 + testimonialsT * 0.65
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[0.07, 6, 6]} />
      <meshBasicMaterial
        ref={matRef}
        color="#F5C842"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
```

- [ ] **Step 2: Write `scene/LedScreens.tsx`**

Six floating screens textured with existing portfolio photos; each brightens as the camera approaches during the **portfolio** beat (index 5). Textures load lazily via drei's `useTexture` inside `<Suspense>` (Scene.tsx wraps it in Step 4).

```tsx
// src/components/marketing/journey/scene/LedScreens.tsx
'use client'

import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const PHOTOS = [
  '/images/photo-2.jpg',
  '/images/photo-4.jpg',
  '/images/photo-5.jpg',
  '/images/photo-6.jpg',
  '/images/photo-7.jpg',
  '/images/photo-8.jpg',
]

// Hung around the camera's portfolio-beat path (K6 area: x -6..6, y 6, z -6..0)
const PLACEMENTS: { position: [number, number, number]; rotationY: number }[] = [
  { position: [-8, 6, -2], rotationY: Math.PI / 5 },
  { position: [-4, 6.5, -6], rotationY: Math.PI / 10 },
  { position: [0, 6, -3], rotationY: 0 },
  { position: [4, 6.5, -6], rotationY: -Math.PI / 10 },
  { position: [8, 6, -2], rotationY: -Math.PI / 5 },
  { position: [0, 7.5, 2], rotationY: Math.PI },
]

export function LedScreens() {
  const progress = useProgress()
  const textures = useTexture(PHOTOS)
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  useFrame(() => {
    const portfolioT = beatLocalT(5, progress.current)
    materials.current.forEach((mat, i) => {
      if (!mat) return
      // screens light up sequentially as the beat advances
      const lit = Math.min(1, Math.max(0, portfolioT * PLACEMENTS.length - i * 0.7))
      mat.color.setScalar(0.12 + lit * 0.88)
    })
  })

  return (
    <group>
      {PLACEMENTS.map((placement, i) => (
        <group key={i} position={placement.position} rotation={[0, placement.rotationY, 0]}>
          {/* gold frame */}
          <mesh position={[0, 0, -0.03]}>
            <boxGeometry args={[4.3, 2.6, 0.05]} />
            <meshStandardMaterial color="#C8922A" emissive="#8B5E10" emissiveIntensity={0.4} />
          </mesh>
          {/* screen */}
          <mesh>
            <planeGeometry args={[4.1, 2.4]} />
            <meshBasicMaterial
              ref={(m) => {
                materials.current[i] = m
              }}
              map={textures[i]}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
```

- [ ] **Step 3: Write `scene/QrPortal.tsx`**

A gate of emissive cubes at the venue entrance (+z, where the ticketing-beat camera looks). Cubes materialize one-by-one during the **ticketing** beat (index 4) with a scan-line pulse. Uses a deterministic pseudo-QR pattern (17×17, seeded) — visual aesthetic only, not a scannable code.

```tsx
// src/components/marketing/journey/scene/QrPortal.tsx
'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const GRID = 17
const CELL = 0.32
const dummy = new THREE.Object3D()

function isDark(row: number, col: number): boolean {
  // Deterministic pseudo-QR: finder squares in three corners + hash noise.
  const inFinder = (r: number, c: number) =>
    (r < 5 && c < 5) || (r < 5 && c >= GRID - 5) || (r >= GRID - 5 && c < 5)
  if (inFinder(row, col)) {
    const lr = row < 5 ? row : row - (GRID - 5)
    const lc = col < 5 ? col : col - (GRID - 5)
    return lr === 0 || lr === 4 || lc === 0 || lc === 4 || (lr === 2 && lc === 2)
  }
  return Math.abs(Math.sin(row * 37.11 + col * 17.77) * 941.7) % 1 > 0.52
}

export function QrPortal() {
  const progress = useProgress()
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const scanRef = useRef<THREE.MeshBasicMaterial>(null)

  const cells = useMemo(() => {
    const out: { x: number; y: number }[] = []
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (isDark(r, c)) out.push({ x: (c - GRID / 2) * CELL, y: (GRID / 2 - r) * CELL + 4 })
      }
    }
    return out
  }, [])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const ticketingT = beatLocalT(4, progress.current)
    const visibleCount = Math.floor(ticketingT * cells.length)

    cells.forEach((cell, i) => {
      const scale = i < visibleCount ? 1 : 0.001
      dummy.position.set(cell.x, cell.y, 24)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true

    if (scanRef.current) {
      const pulse = ticketingT > 0 && ticketingT < 1 ? (Math.sin(clock.getElapsedTime() * 4) + 1) / 2 : 0
      scanRef.current.opacity = 0.35 * pulse * ticketingT
    }
  })

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, cells.length]}>
        <boxGeometry args={[CELL * 0.85, CELL * 0.85, CELL * 0.85]} />
        <meshStandardMaterial color="#C8922A" emissive="#C8922A" emissiveIntensity={1.6} />
      </instancedMesh>
      {/* scan-line */}
      <mesh position={[0, 4, 24.2]}>
        <planeGeometry args={[GRID * CELL * 1.1, 0.12]} />
        <meshBasicMaterial
          ref={scanRef}
          color="#F5C842"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 4: Render them in `Scene.tsx`**

Add imports and render, wrapping `LedScreens` (which loads textures) in `Suspense`:

```tsx
import { Suspense } from 'react'
import { CrowdParticles } from './scene/CrowdParticles'
import { LedScreens } from './scene/LedScreens'
import { QrPortal } from './scene/QrPortal'
```

```tsx
      <CameraRig />
      <Stage />
      <Trusses />
      <SpotBeams />
      <CrowdParticles />
      <QrPortal />
      <Suspense fallback={null}>
        <LedScreens />
      </Suspense>
```

- [ ] **Step 5: Verify**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec tsc --noEmit && pnpm exec vitest run
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/journey/scene/CrowdParticles.tsx src/components/marketing/journey/scene/LedScreens.tsx src/components/marketing/journey/scene/QrPortal.tsx src/components/marketing/journey/Scene.tsx
git commit -m "feat: add crowd particles, LED portfolio screens, and QR portal"
```

---

### Task 6: Overlays — 8 beat overlays wired into the journey

**Files:**
- Create: `src/components/marketing/journey/overlays/OverlayShell.tsx`
- Create: `src/components/marketing/journey/overlays/HeroOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/ManifestoOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/ServicesOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/ProcessOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/TicketingOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/PortfolioOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/TestimonialsOverlay.tsx`
- Create: `src/components/marketing/journey/overlays/ContactOverlay.tsx`
- Modify: `src/app/(marketing)/page.tsx` (pass overlays)

**Interfaces:**
- Consumes: `EventJourney`'s `overlays?: ReactNode[]` prop (Task 3) — array order MUST match `BEATS` order: hero, manifesto, services, process, ticketing, portfolio, testimonials, contact.
- Copy source: reuse headline/card/quote text **verbatim** from the corresponding files in `src/components/marketing/sections/` (read each before writing its overlay). Do not modify those files.

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
      {label && (
        <p
          className="font-mono text-xs tracking-[0.25em] mb-4"
          style={{ color: '#C8922A' }}
        >
          {label}
        </p>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Write the 8 overlays**

Each overlay is a thin presentational component. Pull copy verbatim from the matching section file (read it first). Concrete requirements per overlay:

- `HeroOverlay` — LYANTE wordmark (reuse `src/components/marketing/ui/Logo.tsx` if it renders standalone; otherwise the text "LYANTE" in the site's Bebas-style heading class) + the hero tagline from `sections/Hero.tsx`. No shell scrim (hero floats directly over the scene); center-screen, large.
- `ManifestoOverlay` — the manifesto line from `sections/Manifesto.tsx` ("We don't just cover events. We preserve them." — confirm exact copy in the file) in large italic serif, inside `OverlayShell`.
- `ServicesOverlay` — `OverlayShell wide` + `label="WHAT WE DO"`; a 2×3 grid of the 6 service titles + one-line descriptions from `sections/Services.tsx` (number, label, title, description fields of its data array).
- `ProcessOverlay` — `OverlayShell wide` + `label="HOW WE WORK"`; the 4 phases (PRE-EVENT / EVENT DAY / POST-EVENT / FOREVER) with their item lists from `sections/ProcessTimeline.tsx`, rendered as a horizontal 4-column row (stacks on small screens with `grid-cols-2 md:grid-cols-4`).
- `TicketingOverlay` — `OverlayShell` + `label="SMART TICKETING"`; headline "Zero hassle. Zero fakes." + the checklist items from `sections/TicketingCallout.tsx`; a "GET A DEMO →" link to `/ticketing` with `pointer-events-auto` on the anchor.
- `PortfolioOverlay` — minimal by design (the LED screens carry the visuals): `label="OUR WORK"` + one line, e.g. the section heading text from `sections/Portfolio.tsx`, positioned bottom-center rather than center (use a wrapper `self-end mb-24`).
- `TestimonialsOverlay` — `OverlayShell` + `label="WHAT CLIENTS SAY"`; copy the `testimonials` array verbatim from `sections/Testimonials.tsx` into the overlay file and render the first quote + attribution (name, role). Static — no carousel; YAGNI.
- `ContactOverlay` — `OverlayShell` + heading "Let's create" (confirm exact copy in `sections/Contact.tsx`) + a gold "SEND YOUR BRIEF →" anchor to `/contact` with `pointer-events-auto`.

Styling: use existing Tailwind theme tokens/classes found in the section files (e.g. heading font classes) so typography matches the site. Text colors: ivory `#F0EDE6` for body, gold `#C8922A` for accents.

- [ ] **Step 3: Pass overlays from the page**

Replace `src/app/(marketing)/page.tsx` contents with:

```tsx
import EventJourney from '@/components/marketing/journey/EventJourney'
import { HeroOverlay } from '@/components/marketing/journey/overlays/HeroOverlay'
import { ManifestoOverlay } from '@/components/marketing/journey/overlays/ManifestoOverlay'
import { ServicesOverlay } from '@/components/marketing/journey/overlays/ServicesOverlay'
import { ProcessOverlay } from '@/components/marketing/journey/overlays/ProcessOverlay'
import { TicketingOverlay } from '@/components/marketing/journey/overlays/TicketingOverlay'
import { PortfolioOverlay } from '@/components/marketing/journey/overlays/PortfolioOverlay'
import { TestimonialsOverlay } from '@/components/marketing/journey/overlays/TestimonialsOverlay'
import { ContactOverlay } from '@/components/marketing/journey/overlays/ContactOverlay'

export default function Home() {
  return (
    <EventJourney
      overlays={[
        <HeroOverlay key="hero" />,
        <ManifestoOverlay key="manifesto" />,
        <ServicesOverlay key="services" />,
        <ProcessOverlay key="process" />,
        <TicketingOverlay key="ticketing" />,
        <PortfolioOverlay key="portfolio" />,
        <TestimonialsOverlay key="testimonials" />,
        <ContactOverlay key="contact" />,
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
git add src/components/marketing/journey/overlays/ "src/app/(marketing)/page.tsx"
git commit -m "feat: add journey overlays for all eight beats"
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

Note: `pnpm run build` runs prisma migrate first (needs the DB); `pnpm exec next build` skips that. If `next build` fails on prisma generate, run `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec prisma generate` first. Expected: build succeeds; `/` compiles as a static or client route without prerender errors. (If prerender fails because `EventJourney` touches `document` at module scope, the fix is the existing `webgl === null` first-paint guard — `supportsWebgl()` is only called inside `useEffect`, so this should already be safe.)

- [ ] **Step 3: Dev-server visual smoke test**

```bash
cd /Users/redmen/Projects/event-tickets
source ~/.nvm/nvm.sh && nvm use 22 && pnpm dev
```

Open `http://localhost:3000` in the in-app browser and verify, scrolling top to bottom:
1. Beat 1: high aerial view of dark venue, camera pushes in, LYANTE hero overlay fades in during the dwell.
2. Beat 3: beams sweep on left-to-right while the services overlay is readable.
3. Beat 5: QR portal materializes cube-by-cube ahead of the camera.
4. Beat 6: LED screens show portfolio photos and light up as the camera weaves past.
5. Beat 8: lights dim to the center pair, contact overlay with working "SEND YOUR BRIEF" link (hover/click works despite `pointer-events-none` wrapper).
6. No console errors; scrolling is smooth (no long-task jank warnings).

Fix anything broken (small tweaks to positions/opacity windows are expected tuning, not plan deviations). Stop the dev server when done.

- [ ] **Step 4: Commit any tuning fixes**

```bash
cd /Users/redmen/Projects/event-tickets
git add -A
git commit -m "polish: tune 3D journey timings after visual verification" --allow-empty
```

---

## Manual review (not automatable)

After Task 7, a human should scroll the page end-to-end and judge:
- Does each dwell give enough reading time at a natural scroll pace?
- Do any overlays collide visually with bright scene elements behind them?
- Does the QR portal read as "ticketing" or does it need the overlay's copy to land first?
- Mobile feel (user explicitly chose full-quality 3D everywhere — check it's tolerable on a real phone).

Tuning knobs, all one-line changes: `KEYFRAMES` in `cameraPath.ts`, `TRAVEL_FRACTION`, overlay ramp constants in `overlayOpacity`, `SCROLL_VH_PER_BEAT` in `EventJourney.tsx`.
