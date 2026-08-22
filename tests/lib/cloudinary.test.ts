import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHash } from 'node:crypto'

/**
 * The server half of the integration. Two things are worth locking down:
 *
 * 1. The signature is what Cloudinary trusts, so it is computed here against
 *    an independent SHA-1 rather than by asking the SDK twice.
 * 2. `MEDIA_PURPOSES` is the authorisation boundary — the client sends a
 *    purpose, never a folder, and the map decides which capability may write
 *    where. A purpose added without a capability would be an open upload.
 */

const CLOUD = 'testcloud'
const KEY = '123456789012345'
const SECRET = 'test-api-secret'

beforeEach(() => {
  vi.resetModules()
  process.env.CLOUDINARY_URL = `cloudinary://${KEY}:${SECRET}@${CLOUD}`
})

const load = () => import('@/lib/cloudinary')

describe('isCloudinaryConfigured', () => {
  it('is true with a well-formed CLOUDINARY_URL', async () => {
    const { isCloudinaryConfigured } = await load()
    expect(isCloudinaryConfigured()).toBe(true)
  })

  it('is false when unset, so callers can degrade instead of throwing', async () => {
    delete process.env.CLOUDINARY_URL
    const { isCloudinaryConfigured } = await load()
    expect(isCloudinaryConfigured()).toBe(false)
  })
})

describe('MEDIA_PURPOSES', () => {
  it('gates every purpose behind a capability', async () => {
    const { MEDIA_PURPOSES } = await load()
    for (const [purpose, spec] of Object.entries(MEDIA_PURPOSES)) {
      expect(spec.capability, `${purpose} has no capability`).toBeTruthy()
      expect(spec.folder, `${purpose} has no folder`).toMatch(/^lyante\//)
      expect(spec.resourceTypes.length, `${purpose} allows no resource type`).toBeGreaterThan(0)
    }
  })

  it('maps each purpose to the capability its feature already uses', async () => {
    const { MEDIA_PURPOSES } = await load()
    expect(MEDIA_PURPOSES.event.capability).toBe('EVENT_WRITE')
    expect(MEDIA_PURPOSES.artist.capability).toBe('ARTIST_MANAGE')
    expect(MEDIA_PURPOSES.gallery.capability).toBe('MARKETING_MANAGE')
  })

  it('confines each purpose to its own folder', async () => {
    const { MEDIA_PURPOSES } = await load()
    const folders = Object.values(MEDIA_PURPOSES).map((s) => s.folder)
    expect(new Set(folders).size).toBe(folders.length)
  })

  it('allows video only for the gallery', async () => {
    const { MEDIA_PURPOSES } = await load()
    expect(MEDIA_PURPOSES.gallery.resourceTypes).toContain('video')
    expect(MEDIA_PURPOSES.event.resourceTypes).not.toContain('video')
    expect(MEDIA_PURPOSES.artist.resourceTypes).not.toContain('video')
  })
})

describe('signUpload', () => {
  it('signs exactly the params Cloudinary will receive', async () => {
    const { signUpload } = await load()
    const signed = signUpload('event')

    // Cloudinary's scheme: sorted `k=v` pairs joined by `&`, secret appended,
    // SHA-1 hex. Recomputed here independently of the SDK.
    const expected = createHash('sha1')
      .update(`folder=${signed.folder}&timestamp=${signed.timestamp}${SECRET}`)
      .digest('hex')

    expect(signed.signature).toBe(expected)
  })

  it('returns the public credentials the browser upload needs', async () => {
    const { signUpload } = await load()
    const signed = signUpload('event')
    expect(signed.apiKey).toBe(KEY)
    expect(signed.cloudName).toBe(CLOUD)
    expect(signed.folder).toBe('lyante/events')
  })

  it('never returns the api secret', async () => {
    const { signUpload } = await load()
    expect(JSON.stringify(signUpload('gallery'))).not.toContain(SECRET)
  })

  it('stamps a current unix timestamp', async () => {
    const { signUpload } = await load()
    const now = Math.floor(Date.now() / 1000)
    expect(signUpload('artist').timestamp).toBeGreaterThanOrEqual(now - 2)
  })

  it('throws when unconfigured rather than minting a useless signature', async () => {
    delete process.env.CLOUDINARY_URL
    const { signUpload } = await load()
    expect(() => signUpload('event')).toThrow()
  })
})
