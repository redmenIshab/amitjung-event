import { describe, expect, it } from 'vitest'
import { GENRES, WORKS, filterWorks } from './works'

describe('WORKS data', () => {
  it('has unique ids', () => {
    const ids = WORKS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has positive dimensions on every entry', () => {
    for (const w of WORKS) {
      expect(w.width).toBeGreaterThan(0)
      expect(w.height).toBeGreaterThan(0)
    }
  })

  it('gives every video a poster', () => {
    for (const w of WORKS.filter((w) => w.type === 'video')) {
      expect(w.poster).toBeTruthy()
    }
  })

  it('only uses known genres', () => {
    for (const w of WORKS) {
      expect(GENRES).toContain(w.genre)
    }
  })
})

describe('filterWorks', () => {
  it('passes everything through with all/null', () => {
    expect(filterWorks(WORKS, 'all', null)).toEqual(WORKS)
  })

  it('filters by media type', () => {
    const photos = filterWorks(WORKS, 'photo', null)
    expect(photos.length).toBeGreaterThan(0)
    expect(photos.every((w) => w.type === 'photo')).toBe(true)
    const videos = filterWorks(WORKS, 'video', null)
    expect(videos.every((w) => w.type === 'video')).toBe(true)
    expect(videos.length).toBeGreaterThan(0)
  })

  it('filters by genre', () => {
    const concerts = filterWorks(WORKS, 'all', 'Concerts')
    expect(concerts.length).toBeGreaterThan(0)
    expect(concerts.every((w) => w.genre === 'Concerts')).toBe(true)
  })

  it('combines media and genre as AND', () => {
    const out = filterWorks(WORKS, 'photo', 'Creative')
    expect(out.every((w) => w.type === 'photo' && w.genre === 'Creative')).toBe(true)
  })

  it('preserves original order', () => {
    const photos = filterWorks(WORKS, 'photo', null)
    const orderInSource = WORKS.filter((w) => w.type === 'photo')
    expect(photos).toEqual(orderInSource)
  })
})
