# Lyante Home Page — 3D Scroll Journey Design Spec

## Purpose

Rebuild the Lyante Production marketing home page as a single continuous 3D scroll experience: a stylized concert venue rendered in three.js, with a scroll-scrubbed cinematic camera flythrough. All 8 existing content sections become overlay "stops" along the camera path. Desktop and mobile get the same full-quality experience; browsers without WebGL get the current flat page unchanged.

## Scope

- **In scope:** the home page only (`src/app/(marketing)/page.tsx`).
- **Out of scope:** other marketing pages (work, ticketing, branding, contact), the dashboard/ticketing app, audio, and any reduced-quality mobile mode.

## Approach

React Three Fiber (`@react-three/fiber`) + `@react-three/drei` for the declarative three.js scene, with the project's existing GSAP dependency providing a single `ScrollTrigger` (`scrub: 1`) that maps native scroll position to a progress value 0→1. No scroll hijacking — native scrollbar, trackpad, keyboard all work normally.

New dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`.

## Page architecture

`src/app/(marketing)/page.tsx` renders `<EventJourney />` (client component). Inside:

- **Fixed full-viewport `<Canvas>`** rendering the venue scene behind everything.
- **Tall scroll driver div** (~800vh; 100vh per beat) providing native scroll.
- **8 DOM overlay layers**, absolutely positioned over the canvas, each visible only during its beat's progress window.

Scroll progress drives three things:
1. Camera position/lookAt along a CatmullRom spline (`cameraPath.ts` — pure module, unit-tested).
2. Scene events keyed to progress windows (spotlights igniting, QR portal materializing, LED screens lighting).
3. Overlay opacity/transform per beat window.

## File layout

All new code under `src/components/marketing/journey/`:

```
EventJourney.tsx         — orchestrator: WebGL check, scroll driver, canvas, overlays
cameraPath.ts            — beat definitions + spline math (pure, Vitest-tested)
Scene.tsx                — R3F scene root, camera rig, fog, lighting
scene/Stage.tsx          — stage platform + backdrop
scene/Trusses.tsx        — lighting truss frames
scene/SpotBeams.tsx      — additive-blend cone "volumetric" spotlight beams
scene/CrowdParticles.tsx — instanced-mesh particle crowd (~2,000 points)
scene/LedScreens.tsx     — floating screens textured with portfolio photos
scene/QrPortal.tsx       — glowing QR gate built from emissive cubes
overlays/                — 8 thin overlay components (reused copy, restyled)
```

Existing section components (`Hero.tsx`, `Manifesto.tsx`, etc.) stay untouched on disk — they are the no-WebGL fallback.

## The venue scene

Stylized dark concert space, everything procedural (no GLTF/model files):

- Palette: emissive gold (`#C8922A`, `#F5C842`) against near-black (`#080808`), scene fog for depth.
- Stage: low wide platform + backdrop panel.
- Trusses: box-geometry frames overhead.
- Spot beams: cone meshes with additive blending and gradient opacity — faked volumetrics, cheap and effective in fog.
- Crowd: single instanced mesh of ~2,000 glowing dots with gentle sway.
- LED screens: planes textured with the existing optimized portfolio images.
- QR portal: emissive cubes arranged in the same QR aesthetic as the ticketing page.

## Camera journey — 8 beats

Continuous spline flythrough, no cuts. Beat boundaries have small dwell plateaus in the easing so overlays get comfortable reading windows.

| # | Beat | Progress window | Camera move | Scene event | Overlay content |
|---|------|-----------------|-------------|-------------|-----------------|
| 1 | Hero | 0–.12 | High above venue, slow push-in toward glowing stage | Single spotlight snaps on | LYANTE wordmark + tagline |
| 2 | Manifesto | .12–.24 | Swoop down through haze to face the stage | Haze thickens, warm glow rises | "We don't just cover events…" |
| 3 | Services | .24–.36 | Track sideways along trusses | 6 beams sweep on one-by-one | Services cards |
| 4 | Process | .36–.48 | Dolly along stage edge | 4 spotlight pools ignite sequentially | Process timeline |
| 5 | Ticketing | .48–.62 | Dive toward venue entrance | QR portal materializes cube-by-cube, scan-line pulse | "Zero hassle. Zero fakes." callout |
| 6 | Portfolio | .62–.78 | Weave between hanging LED screens | Screens light with portfolio photos as camera passes | Minimal captions |
| 7 | Testimonials | .78–.88 | Pull back and up, reveal full crowd | Crowd particles brighten in waves | Rotating client quotes |
| 8 | Contact | .88–1.0 | Rise above venue; house lights fade to one spotlight | Everything dims except center stage | "Let's create" + Send Your Brief CTA |

## Overlays

Thin new components reusing the copy (headlines, card text, quotes) from existing sections, restyled for floating-over-3D legibility: dark scrims behind text, entrance animation driven by the same scroll progress (no IntersectionObserver).

## Fallback & error handling

- On mount: WebGL capability check (`webgl2` falling back to `webgl`). Unavailable → render the existing 8 flat sections.
- Runtime canvas errors: React error boundary around the Canvas → same flat fallback.

## Performance stance

Full quality on all devices, one code path (explicit user decision — no reduced mobile mode). Standard hygiene only:

- Device pixel ratio capped at 2.
- Crowd = 1 instanced draw call.
- Beams = additive cones, no raymarching.
- Portfolio textures lazy-loaded, reuse existing optimized images.
- Rendering paused when the page/tab is not visible.

## Testing

- `cameraPath.ts` gets Vitest coverage: beat windows contiguous and exactly covering 0→1; camera positions finite and continuous at boundaries; dwell plateaus non-overlapping.
- Scene components verified visually via dev server (not unit-testable meaningfully).
- `tsc` type-check must remain clean; existing tests must keep passing.
