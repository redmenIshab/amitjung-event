import { describe, it, expect, vi, beforeEach } from 'vitest'

const incr = vi.hoisted(() => vi.fn())
const expire = vi.hoisted(() => vi.fn())
const isConfigured = vi.hoisted(() => ({ value: true }))

vi.mock('@/lib/upstash/upstash', () => ({
  redisConfig: { incr, expire },
  get isRedisConfigured() {
    return isConfigured.value
  },
}))

import { clientIp, rateLimit } from '@/lib/rateLimit'

beforeEach(() => {
  incr.mockReset()
  expire.mockReset()
  isConfigured.value = true
})

describe('rateLimit', () => {
  it('allows a request under the limit and reports what is left', async () => {
    incr.mockResolvedValue(1)
    const r = await rateLimit({ key: 'register:1.2.3.4', limit: 5, windowSeconds: 60 })
    expect(r.ok).toBe(true)
    expect(r.remaining).toBe(4)
  })

  it('sets the expiry only on the first hit of a window', async () => {
    incr.mockResolvedValue(1)
    await rateLimit({ key: 'k', limit: 5, windowSeconds: 60 })
    expect(expire).toHaveBeenCalledWith(expect.stringContaining('k'), 60)

    expire.mockClear()
    incr.mockResolvedValue(2)
    await rateLimit({ key: 'k', limit: 5, windowSeconds: 60 })
    // Re-setting it on every hit would slide the window forward forever and
    // never let the counter reset.
    expect(expire).not.toHaveBeenCalled()
  })

  it('refuses once the limit is exceeded', async () => {
    incr.mockResolvedValue(6)
    const r = await rateLimit({ key: 'k', limit: 5, windowSeconds: 60 })
    expect(r.ok).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.retryAfterSeconds).toBe(60)
  })

  it('allows exactly the limit, refusing only the one after', async () => {
    incr.mockResolvedValue(5)
    expect((await rateLimit({ key: 'k', limit: 5, windowSeconds: 60 })).ok).toBe(true)
    incr.mockResolvedValue(6)
    expect((await rateLimit({ key: 'k', limit: 5, windowSeconds: 60 })).ok).toBe(false)
  })

  it('allows through when Redis is not configured', async () => {
    // Matches the codebase convention that the app runs without Upstash
    // (ARCHITECTURE §15.7). Documented as fail-open on purpose.
    isConfigured.value = false
    const r = await rateLimit({ key: 'k', limit: 1, windowSeconds: 60 })
    expect(r.ok).toBe(true)
    expect(incr).not.toHaveBeenCalled()
  })

  it('allows through when Redis errors, rather than taking the route down', async () => {
    incr.mockRejectedValue(new Error('upstash down'))
    const r = await rateLimit({ key: 'k', limit: 1, windowSeconds: 60 })
    expect(r.ok).toBe(true)
  })
})

describe('clientIp', () => {
  const req = (headers: Record<string, string>) =>
    new Request('http://localhost', { headers })

  it('takes the first entry of x-forwarded-for', () => {
    // Vercel appends proxies; the original client is first.
    expect(clientIp(req({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    expect(clientIp(req({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8')
  })

  it('returns a stable placeholder when no header is present', () => {
    const ip = clientIp(req({}))
    expect(ip.length).toBeGreaterThan(0)
  })
})
