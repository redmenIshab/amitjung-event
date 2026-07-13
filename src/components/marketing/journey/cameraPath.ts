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
// hold at 1 until .92, fade out by 1.0. Two exceptions:
// - the FIRST beat (hero) is visible from t=0, so the page has content
//   at load before any scrolling happens;
// - the LAST beat (CTA) never fades out — it stays fully visible at the
//   end of the scroll.
export function overlayOpacity(beatIndex: number, progress: number): number {
  const beat = BEATS[beatIndex]
  if (!beat) return 0
  const p = clamp01(progress)
  if (p < beat.start || p > beat.end) return 0
  const t = beatLocalT(beatIndex, p)
  const isFirstBeat = beatIndex === 0
  const isLastBeat = beatIndex === BEATS.length - 1
  if (!isFirstBeat) {
    if (t < 0.5) return 0
    if (t < 0.62) return smoothstep((t - 0.5) / 0.12)
  }
  if (isLastBeat || t <= 0.92) return 1
  return 1 - smoothstep((t - 0.92) / 0.08)
}
