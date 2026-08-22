import { describe, it, expect, beforeEach } from 'vitest'

/**
 * `mediaUrl` is the single resolver every render site goes through, so its
 * passthrough behaviour is what keeps the pre-Cloudinary data working: every
 * event poster and artist photo in the database today is a pasted third-party
 * URL, and the marketing pages still reference `/public` paths until the
 * gallery migration lands. A regression here blanks images site-wide.
 */

const CLOUD = 'r7waqwpz'

// The cloud name is read from the environment on every call, so a test can
// change it without fighting the module cache.
const loadMedia = () => import('@/lib/media')

beforeEach(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = CLOUD
})

describe('mediaUrl — passthrough', () => {
  it('returns null for empty values', async () => {
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl(null)).toBeNull()
    expect(mediaUrl(undefined)).toBeNull()
    expect(mediaUrl('')).toBeNull()
  })

  it('leaves an https URL untouched', async () => {
    const { mediaUrl } = await loadMedia()
    const url = 'https://images.example.com/poster.jpg?v=2'
    expect(mediaUrl(url)).toBe(url)
  })

  it('leaves an http URL untouched', async () => {
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl('http://legacy.example.com/a.png')).toBe('http://legacy.example.com/a.png')
  })

  it('leaves a /public path untouched', async () => {
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl('/images/photo-3.jpg')).toBe('/images/photo-3.jpg')
  })

  it('does not apply transformations to a passthrough value', async () => {
    const { mediaUrl } = await loadMedia()
    // A width request must not corrupt a URL we do not control.
    expect(mediaUrl('https://x.test/a.jpg', { width: 400 })).toBe('https://x.test/a.jpg')
  })
})

describe('mediaUrl — public ids', () => {
  it('builds an f_auto,q_auto delivery URL', async () => {
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl('lyante/events/poster1')).toBe(
      `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto/lyante/events/poster1`,
    )
  })

  it('adds a width and fill crop when asked', async () => {
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl('lyante/events/poster1', { width: 1200 })).toBe(
      `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_1200,c_fill/lyante/events/poster1`,
    )
  })

  it('honours an explicit crop mode', async () => {
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl('lyante/events/p', { width: 600, crop: 'fit' })).toBe(
      `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_600,c_fit/lyante/events/p`,
    )
  })

  it('appends an explicit delivery format when asked', async () => {
    const { mediaUrl } = await loadMedia()
    // Video is delivered as explicit mp4 rather than trusting f_auto content
    // negotiation, which varies by client and leaves the source QuickTime
    // container in play for anything that does not negotiate.
    expect(mediaUrl('lyante/gallery/showreel', { resourceType: 'video', format: 'mp4' })).toBe(
      `https://res.cloudinary.com/${CLOUD}/video/upload/f_auto,q_auto/lyante/gallery/showreel.mp4`,
    )
  })

  it('does not append a format to a passthrough URL', async () => {
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl('/video/showreel.mov', { format: 'mp4' })).toBe('/video/showreel.mov')
  })

  it('serves video from the video delivery type', async () => {
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl('lyante/gallery/showreel', { resourceType: 'video' })).toBe(
      `https://res.cloudinary.com/${CLOUD}/video/upload/f_auto,q_auto/lyante/gallery/showreel`,
    )
  })
})

describe('mediaUrl — unconfigured', () => {
  it('returns the raw value rather than a broken URL', async () => {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const { mediaUrl } = await loadMedia()
    // The app must still run with Cloudinary unset (ARCHITECTURE §15.7).
    expect(mediaUrl('lyante/events/poster1')).toBe('lyante/events/poster1')
  })

  it('still passes real URLs through', async () => {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const { mediaUrl } = await loadMedia()
    expect(mediaUrl('https://x.test/a.jpg')).toBe('https://x.test/a.jpg')
  })
})

describe('mediaRefSchema', () => {
  it('accepts a public id', async () => {
    const { mediaRefSchema } = await loadMedia()
    expect(mediaRefSchema.safeParse('lyante/events/abc123').success).toBe(true)
  })

  it('accepts a legacy pasted URL', async () => {
    const { mediaRefSchema } = await loadMedia()
    expect(mediaRefSchema.safeParse('https://picsum.photos/900').success).toBe(true)
  })

  it('accepts an empty string', async () => {
    const { mediaRefSchema } = await loadMedia()
    // The event poster is optional; the form posts '' when nothing is set.
    expect(mediaRefSchema.safeParse('').success).toBe(true)
  })

  it('rejects whitespace and control characters', async () => {
    const { mediaRefSchema } = await loadMedia()
    expect(mediaRefSchema.safeParse('has space').success).toBe(false)
    expect(mediaRefSchema.safeParse('bad\nvalue').success).toBe(false)
  })

  it('rejects a path traversal attempt', async () => {
    const { mediaRefSchema } = await loadMedia()
    expect(mediaRefSchema.safeParse('../../etc/passwd').success).toBe(false)
  })

  it('rejects a javascript: URL', async () => {
    const { mediaRefSchema } = await loadMedia()
    // This value lands in an <img src>; a scheme we do not recognise must not
    // survive validation.
    expect(mediaRefSchema.safeParse('javascript:alert(1)').success).toBe(false)
  })
})
