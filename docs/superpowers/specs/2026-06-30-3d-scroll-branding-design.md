# Lyante Branding Page — 3D Scroll Journey Design Spec

> **Revision note:** originally scoped for the home page; the user redirected it to `/branding`. The home page stays completely untouched. Beat structure remapped from 8 home-page sections to the branding page's 6 sections.

## Purpose

Rebuild the Lyante Production `/branding` page as a single continuous 3D scroll experience: a stylized concert venue rendered in three.js, with a scroll-scrubbed cinematic camera flythrough. The branding page's 6 existing content sections become overlay "stops" along the camera path. Desktop and mobile get the same full-quality experience; browsers without WebGL get the current flat branding page unchanged.

## Scope

- **In scope:** `/branding` only (`src/app/(marketing)/branding/page.tsx`).
- **Out of scope:** the home page and all other marketing pages, the dashboard/ticketing app, audio, and any reduced-quality mobile mode.

## Approach

React Three Fiber (`@react-three/fiber`) + `@react-three/drei` for the declarative three.js scene, with the project's existing GSAP dependency providing a single `ScrollTrigger` (`scrub: 1`) that maps native scroll position to a progress value 0→1. No scroll hijacking — native scrollbar, trackpad, keyboard all work normally.

New dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`.

## Page architecture

`src/app/(marketing)/branding/page.tsx` renders `<EventJourney />` (client component; the page keeps its existing `metadata` export via a thin server-component wrapper). Inside:

- **Fixed full-viewport `<Canvas>`** rendering the venue scene behind everything.
- **Tall scroll driver div** (~600vh; 100vh per beat) providing native scroll.
- **6 DOM overlay layers**, absolutely positioned over the canvas, each visible only during its beat's progress window.

Scroll progress drives three things:
1. Camera position/lookAt along keyframed paths (`cameraPath.ts` — pure module, unit-tested).
2. Scene events keyed to progress windows (spotlights igniting, brand-board panels lighting, crowd waves).
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
scene/BrandPanels.tsx    — floating panels showing the brand-board colors/typography (procedural, no textures)
overlays/                — 6 thin overlay components (reused copy, restyled)
```

Existing branding section components (`src/components/marketing/sections/branding/*`) stay untouched on disk — they are the no-WebGL fallback.

## The venue scene

Stylized dark concert space, everything procedural (no GLTF/model files, no image textures):

- Palette: emissive gold (`#C8922A`, `#F5C842`) against near-black (`#080808`), scene fog for depth.
- Stage: low wide platform + backdrop panel.
- Trusses: box-geometry frames overhead.
- Spot beams: cone meshes with additive blending — faked volumetrics, cheap and effective in fog.
- Crowd: single instanced mesh of ~2,000 glowing dots with gentle sway.
- Brand panels: floating framed planes rendering the BrandBoard's 5 color swatches (Ink `#0E1522`, Gold `#C8922A`, Bone `#E8E2D5`, Clay `#B4443C`, Sage `#6B8F71`) as emissive color planes plus a gold "typography" panel — procedural materials, no image loading.

## Camera journey — 6 beats

Continuous keyframed flythrough, no cuts. Beat boundaries have dwell plateaus (camera travels during the first 60% of each beat window, then holds) so each overlay gets a comfortable reading window.

| # | Beat | Progress window | Camera move | Scene event | Overlay content |
|---|------|-----------------|-------------|-------------|-----------------|
| 1 | Hero | 0–.16 | High above venue, slow push-in toward glowing stage | Single spotlight snaps on | BrandingHero headline + tagline |
| 2 | Core Services | .16–.33 | Track sideways along the lighting trusses | 6 beams sweep on one-by-one | CoreServices cards (content, social, web) |
| 3 | Brand Board | .33–.52 | Weave between floating brand panels | Panels light up sequentially: color swatches then typography | Brand board copy (colors + type) |
| 4 | Deliverables | .52–.70 | Dolly along the stage edge | 4 spotlight pools ignite sequentially | Deliverables checklist |
| 5 | Build Phases | .70–.86 | Pull back and up, reveal the full crowd | Crowd particles brighten in 4 waves (Discover → Design → Deploy → Amplify) | The 4 phases with copy |
| 6 | CTA | .86–1.0 | Rise above venue; house lights fade to one spotlight | Everything dims except center stage | "Ready to become unforgettable?" + BRIEF US / SEE OUR WORK buttons |

## Overlays

Thin new components reusing the copy (headlines, card text, phase descriptions) verbatim from the existing branding section components, restyled for floating-over-3D legibility: dark scrims behind text, entrance animation driven by the same scroll progress (no IntersectionObserver). Interactive elements (BRIEF US / SEE OUR WORK links) re-enable pointer events on themselves inside the pointer-events-none overlay wrappers.

## Fallback & error handling

- On mount: WebGL capability check (`webgl2` falling back to `webgl`). Unavailable → render the existing 6 flat branding sections (including the closing CTA markup) exactly as today.
- Runtime canvas errors: React error boundary around the Canvas → same flat fallback.

## Performance stance

Full quality on all devices, one code path (explicit user decision — no reduced mobile mode). Standard hygiene only:

- Device pixel ratio capped at 2.
- Crowd = 1 instanced draw call.
- Beams = additive cones, no raymarching.
- No image textures at all in the scene (brand panels are procedural colors).
- Rendering paused when the page/tab is not visible (browser rAF throttling).

## Testing

- `cameraPath.ts` gets Vitest coverage: beat windows contiguous and exactly covering 0→1; camera positions finite and continuous at boundaries; overlay opacity windows non-overlapping.
- Scene components verified visually via dev server (not unit-testable meaningfully).
- `tsc` type-check must remain clean; existing tests must keep passing.
