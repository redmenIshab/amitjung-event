import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * Admin password reset — the only way back into a locked-out staff account,
 * since there is no self-service forgot-password flow.
 */

const requireApiCapability = vi.hoisted(() => vi.fn())
const userFindUnique = vi.hoisted(() => vi.fn())
const userUpdate = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn())
const sendStaffCredentialsEmail = vi.hoisted(() => vi.fn())
const emailEnabled = vi.hoisted(() => ({ value: false }))

vi.mock('@/lib/rbac', () => ({ requireApiCapability }))
vi.mock('@/lib/rateLimit', () => ({ rateLimit }))
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: userFindUnique, update: userUpdate } },
}))
vi.mock('@/lib/email', () => ({
  isEmailEnabled: () => emailEnabled.value,
  sendStaffCredentialsEmail,
}))

import { POST } from '@/app/api/users/[userId]/password/route'

const params = { params: Promise.resolve({ userId: 'u1' }) }
const admin = { session: { user: { id: 'admin1', role: 'ADMIN' } } }
const post = (body: unknown) =>
  POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }), params)

const target = { id: 'u1', name: 'Ramesh', email: 'ramesh@crew.np', role: 'ORGANIZER' }

beforeEach(() => {
  requireApiCapability.mockReset().mockResolvedValue(admin)
  userFindUnique.mockReset().mockResolvedValue(target)
  userUpdate.mockReset().mockResolvedValue(target)
  rateLimit.mockReset().mockResolvedValue({ ok: true, remaining: 9, retryAfterSeconds: 0 })
  sendStaffCredentialsEmail.mockReset()
  emailEnabled.value = false
})

describe('authorization', () => {
  it('requires USER_MANAGE', async () => {
    requireApiCapability.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    )
    const res = await post({ password: 'longenough1' })
    expect(res.status).toBe(403)
    expect(requireApiCapability).toHaveBeenCalledWith('USER_MANAGE')
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('is rate limited', async () => {
    rateLimit.mockResolvedValue({ ok: false, remaining: 0, retryAfterSeconds: 300 })
    const res = await post({ password: 'longenough1' })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('300')
    expect(userUpdate).not.toHaveBeenCalled()
  })
})

describe('resetting', () => {
  it('stores a hash, never the plain password', async () => {
    await post({ password: 'longenough1' })
    const data = userUpdate.mock.calls[0][0].data
    expect(data.password).not.toBe('longenough1')
    expect(data.password).toMatch(/^\$2[aby]\$/)
  })

  it('stamps passwordChangedAt in the same write as the hash', async () => {
    // Split across two writes, a crash between them leaves a session valid
    // against a credential that no longer exists.
    await post({ password: 'longenough1' })
    const data = userUpdate.mock.calls[0][0].data
    expect(data.passwordChangedAt).toBeInstanceOf(Date)
    expect(Object.keys(data).sort()).toEqual(['password', 'passwordChangedAt'])
  })

  it('rejects a password shorter than the creation minimum', async () => {
    const res = await post({ password: 'short' })
    expect(res.status).toBe(422)
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('rejects a missing body', async () => {
    expect((await post({})).status).toBe(422)
  })

  it('404s an unknown account without writing', async () => {
    userFindUnique.mockResolvedValue(null)
    expect((await post({ password: 'longenough1' })).status).toBe(404)
    expect(userUpdate).not.toHaveBeenCalled()
  })
})

describe('handing the password back', () => {
  it('returns it once when mail is disabled — there is no other way to recover it', async () => {
    const res = await post({ password: 'longenough1' })
    const body = await res.json()
    expect(body.password).toBe('longenough1')
    expect(body.emailSent).toBe(false)
  })

  it('emails it and withholds it from the response when mail is on', async () => {
    emailEnabled.value = true
    sendStaffCredentialsEmail.mockResolvedValue(undefined)
    const body = await (await post({ password: 'longenough1' })).json()
    expect(sendStaffCredentialsEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ramesh@crew.np', password: 'longenough1' }),
    )
    expect(body.emailSent).toBe(true)
    expect(body.password).toBeUndefined()
  })

  it('still succeeds, and hands the password back, when the email throws', async () => {
    emailEnabled.value = true
    sendStaffCredentialsEmail.mockRejectedValue(new Error('smtp down'))
    const res = await post({ password: 'longenough1' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.emailSent).toBe(false)
    expect(body.password).toBe('longenough1')
  })
})

describe('resetting your own password', () => {
  it('is allowed, and flags that it ends the current session', async () => {
    userFindUnique.mockResolvedValue({ ...target, id: 'admin1' })
    const body = await (
      await POST(
        new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({ password: 'longenough1' }),
        }),
        { params: Promise.resolve({ userId: 'admin1' }) },
      )
    ).json()
    // The admin's own token predates the new stamp, so it is stale too — the
    // UI needs to say so rather than leaving them confused by a sudden logout.
    expect(body.signedOutSelf).toBe(true)
  })

  it('is not flagged when resetting somebody else', async () => {
    const body = await (await post({ password: 'longenough1' })).json()
    expect(body.signedOutSelf).toBe(false)
  })
})
