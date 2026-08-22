import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Authorization sweep for the media endpoints.
 *
 * The client sends a `purpose`, never a folder, and the server resolves both
 * the capability and the destination from it. These tests are the proof of
 * that boundary: they drive the real `rbac.ts` gate against a mocked session,
 * so a capability-map regression fails here rather than in production.
 */

const mockGetServerSession = vi.hoisted(() => vi.fn())
const mockRateLimit = vi.hoisted(() => vi.fn())
const mockDestroy = vi.hoisted(() => vi.fn())
const eventUpdate = vi.hoisted(() => vi.fn())
const artistUpdate = vi.hoisted(() => vi.fn())

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit }))
vi.mock('@/lib/prisma', () => ({
  prisma: { event: { update: eventUpdate }, artist: { update: artistUpdate } },
}))
// Only `destroyAsset` is stubbed — the signing tests below exercise the real
// implementation, and a partial mock keeps both honest in one file.
vi.mock('@/lib/cloudinary', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cloudinary')>()),
  destroyAsset: mockDestroy,
}))

import { POST as signRoute } from '@/app/api/media/sign/route'
import { DELETE as deleteRoute } from '@/app/api/media/route'

const CLOUD = 'testcloud'
const SECRET = 'test-api-secret'

function post(body: unknown) {
  return new Request('http://localhost/api/media/sign', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function del(body: unknown) {
  return new Request('http://localhost/api/media', {
    method: 'DELETE',
    body: JSON.stringify(body),
  })
}

function signIn(role: string | null) {
  mockGetServerSession.mockResolvedValue(role ? { user: { id: 'u1', role } } : null)
}

beforeEach(() => {
  process.env.CLOUDINARY_URL = `cloudinary://123456789012345:${SECRET}@${CLOUD}`
  mockRateLimit.mockResolvedValue({ ok: true, remaining: 10, retryAfterSeconds: 0 })
  mockDestroy.mockResolvedValue(undefined)
  eventUpdate.mockResolvedValue({})
  artistUpdate.mockResolvedValue({})
})

describe('POST /api/media/sign — authorization', () => {
  it('rejects an anonymous caller', async () => {
    signIn(null)
    expect((await signRoute(post({ purpose: 'event' }))).status).toBe(401)
  })

  it('lets an ADMIN sign an event poster upload', async () => {
    signIn('ADMIN')
    const res = await signRoute(post({ purpose: 'event' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.folder).toBe('lyante/events')
    expect(body.signature).toMatch(/^[a-f0-9]{40}$/)
  })

  it('refuses a MANAGER an event poster signature', async () => {
    // The assertion that proves the purpose->capability map: MARKETING_MANAGE
    // must not become a way to overwrite event media.
    signIn('MANAGER')
    expect((await signRoute(post({ purpose: 'event' }))).status).toBe(403)
  })

  it('lets a MANAGER sign a gallery upload', async () => {
    signIn('MANAGER')
    expect((await signRoute(post({ purpose: 'gallery' }))).status).toBe(200)
  })

  it('refuses a STAFF member every purpose', async () => {
    signIn('STAFF')
    for (const purpose of ['event', 'artist', 'gallery']) {
      expect((await signRoute(post({ purpose }))).status, purpose).toBe(403)
    }
  })

  it('refuses an ORGANIZER every purpose', async () => {
    signIn('ORGANIZER')
    for (const purpose of ['event', 'artist', 'gallery']) {
      expect((await signRoute(post({ purpose }))).status, purpose).toBe(403)
    }
  })

  it('refuses a plain USER every purpose', async () => {
    signIn('USER')
    for (const purpose of ['event', 'artist', 'gallery']) {
      expect((await signRoute(post({ purpose }))).status, purpose).toBe(403)
    }
  })

  it('refuses a PARTICIPANT — buyers never upload', async () => {
    signIn('PARTICIPANT')
    expect((await signRoute(post({ purpose: 'event' }))).status).toBe(403)
  })
})

describe('POST /api/media/sign — input and configuration', () => {
  it('422s an unknown purpose rather than inventing a folder', async () => {
    signIn('ADMIN')
    expect((await signRoute(post({ purpose: 'wat' }))).status).toBe(422)
  })

  it('422s a missing purpose', async () => {
    signIn('ADMIN')
    expect((await signRoute(post({}))).status).toBe(422)
  })

  it('422s a malformed body instead of throwing', async () => {
    signIn('ADMIN')
    const bad = new Request('http://localhost/api/media/sign', { method: 'POST', body: 'not json' })
    expect((await signRoute(bad)).status).toBe(422)
  })

  it('503s when Cloudinary is unconfigured', async () => {
    delete process.env.CLOUDINARY_URL
    signIn('ADMIN')
    expect((await signRoute(post({ purpose: 'event' }))).status).toBe(503)
  })

  it('429s when the caller exceeds the signing rate limit', async () => {
    signIn('ADMIN')
    mockRateLimit.mockResolvedValue({ ok: false, remaining: 0, retryAfterSeconds: 42 })
    const res = await signRoute(post({ purpose: 'event' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
  })

  it('never leaks the api secret to the client', async () => {
    signIn('ADMIN')
    const body = await (await signRoute(post({ purpose: 'event' }))).text()
    expect(body).not.toContain(SECRET)
  })
})

describe('DELETE /api/media', () => {
  it('rejects an anonymous caller', async () => {
    signIn(null)
    const res = await deleteRoute(del({ purpose: 'event', publicId: 'lyante/events/a' }))
    expect(res.status).toBe(401)
  })

  it('refuses a MANAGER deleting an event poster', async () => {
    signIn('MANAGER')
    const res = await deleteRoute(del({ purpose: 'event', publicId: 'lyante/events/a' }))
    expect(res.status).toBe(403)
  })

  it('refuses a public id outside the purpose folder', async () => {
    // Without this check a MARKETING_MANAGE holder could pass purpose=gallery
    // with an event poster's id and destroy a live event's image.
    signIn('MANAGER')
    const res = await deleteRoute(del({ purpose: 'gallery', publicId: 'lyante/events/poster' }))
    expect(res.status).toBe(422)
  })

  it('refuses a URL — only assets we own can be destroyed', async () => {
    signIn('ADMIN')
    const res = await deleteRoute(del({ purpose: 'event', publicId: 'https://x.test/a.jpg' }))
    expect(res.status).toBe(422)
  })

  it('clears the column before destroying, so no row points at a dead asset', async () => {
    signIn('ADMIN')
    const res = await deleteRoute(
      del({ purpose: 'event', publicId: 'lyante/events/a', recordId: 'evt1' }),
    )
    expect(res.status).toBe(200)
    expect(eventUpdate).toHaveBeenCalledWith({ where: { id: 'evt1' }, data: { image: null } })
  })

  it('clears an artist image by record id', async () => {
    signIn('ADMIN')
    const res = await deleteRoute(
      del({ purpose: 'artist', publicId: 'lyante/artists/a', recordId: 'art1' }),
    )
    expect(res.status).toBe(200)
    expect(artistUpdate).toHaveBeenCalledWith({ where: { id: 'art1' }, data: { artistImage: '' } })
  })

  it('destroys an unsaved upload without touching the database', async () => {
    signIn('ADMIN')
    const res = await deleteRoute(del({ purpose: 'event', publicId: 'lyante/events/orphan' }))
    expect(res.status).toBe(200)
    expect(eventUpdate).not.toHaveBeenCalled()
  })
})
