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

  it('camera is stationary during the dwell', () => {
    const at = (t: number) => BEATS[2].start + t * (BEATS[2].end - BEATS[2].start)
    expect(getCameraState(at(0.7))).toEqual(getCameraState(at(0.95)))
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

  it('returns 0 for out-of-range beat indices', () => {
    expect(overlayOpacity(BEATS.length, 0.5)).toBe(0)
  })

  it('keeps the final CTA overlay fully visible at the end of the scroll', () => {
    expect(overlayOpacity(BEATS.length - 1, 1)).toBe(1)
    expect(overlayOpacity(BEATS.length - 1, 0.99)).toBe(1)
  })

  it('overlays never exceed opacity 1 combined at any progress', () => {
    for (let p = 0; p <= 1.0001; p += 0.005) {
      let sum = 0
      for (let i = 0; i < BEATS.length; i++) sum += overlayOpacity(i, Math.min(p, 1))
      expect(sum).toBeLessThanOrEqual(1.0001)
    }
  })
})
