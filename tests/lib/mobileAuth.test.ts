import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SignJWT } from 'jose'


import {
  signMobileToken,
  verifyMobileToken,
  sessionFromBearer,
  allowedAudiences,
} from '@/lib/mobileAuth'

const SECRET = 'test-secret-value-for-mobile-auth'

/** sessionFromBearer reads the header off the Request it is handed. */
const reqWith = (auth: string | null) =>
  new Request('http://localhost/api/profile', auth ? { headers: { authorization: auth } } : undefined)

describe('mobile bearer tokens', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = SECRET
  })
  afterEach(() => {
    delete process.env.GOOGLE_MOBILE_CLIENT_IDS
  })

  it('round-trips a participant through sign and verify', async () => {
    const token = await signMobileToken({
      participantId: 'ptc_1',
      email: 'buyer@example.com',
      name: 'Buyer',
    })
    expect(await verifyMobileToken(token)).toEqual({
      participantId: 'ptc_1',
      email: 'buyer@example.com',
      name: 'Buyer',
    })
  })

  it('rejects a token signed with a different secret', async () => {
    const foreign = await new SignJWT({ pid: 'ptc_1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('ptc_1')
      .setIssuer('lyante-mobile')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-different-secret'))
    expect(await verifyMobileToken(foreign)).toBeNull()
  })

  it('rejects a token from another issuer', async () => {
    // A NextAuth-style token must not be replayable as a mobile session.
    const other = await new SignJWT({ pid: 'ptc_1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('ptc_1')
      .setIssuer('somewhere-else')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyMobileToken(other)).toBeNull()
  })

  it('rejects an expired token', async () => {
    const expired = await new SignJWT({ pid: 'ptc_1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('ptc_1')
      .setIssuer('lyante-mobile')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyMobileToken(expired)).toBeNull()
  })

  it('rejects a token whose subject and pid disagree', async () => {
    const mismatched = await new SignJWT({ pid: 'ptc_victim' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('ptc_attacker')
      .setIssuer('lyante-mobile')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyMobileToken(mismatched)).toBeNull()
  })

  it('rejects garbage', async () => {
    expect(await verifyMobileToken('not-a-jwt')).toBeNull()
  })
})

describe('sessionFromBearer', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = SECRET
  })

  it('returns null without an Authorization header', async () => {
    expect(await sessionFromBearer(reqWith(null))).toBeNull()
  })

  it('ignores a non-Bearer scheme', async () => {
    expect(await sessionFromBearer(reqWith('Basic abc123'))).toBeNull()
  })

  it('resolves a valid token to a PARTICIPANT session', async () => {
    const token = await signMobileToken({
      participantId: 'ptc_9',
      email: 'b@example.com',
      name: 'Buyer',
    })
    const session = await sessionFromBearer(reqWith(`Bearer ${token}`))
    expect(session?.user.id).toBe('ptc_9')
    expect(session?.user.email).toBe('b@example.com')
  })

  // The security boundary: a bearer token must never carry a staff role.
  it('always resolves to PARTICIPANT, never a staff role', async () => {
    const forged = await new SignJWT({ pid: 'ptc_9', role: 'ADMIN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('ptc_9')
      .setIssuer('lyante-mobile')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET))
    expect((await sessionFromBearer(reqWith(`Bearer ${forged}`)))?.user.role).toBe('PARTICIPANT')
  })

  it('returns null for an invalid token rather than a partial session', async () => {
    expect(await sessionFromBearer(reqWith('Bearer garbage.token.here'))).toBeNull()
  })
})

describe('allowedAudiences', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_MOBILE_CLIENT_IDS
    delete process.env.GOOGLE_CLIENT_ID
  })

  it('is empty when nothing is configured — callers must refuse to sign in', () => {
    expect(allowedAudiences()).toEqual([])
  })

  it('splits and trims the mobile client list', () => {
    process.env.GOOGLE_MOBILE_CLIENT_IDS = ' ios.apps.googleusercontent.com , android.apps.googleusercontent.com '
    expect(allowedAudiences()).toEqual([
      'ios.apps.googleusercontent.com',
      'android.apps.googleusercontent.com',
    ])
  })

  it('includes the web client and de-duplicates', () => {
    process.env.GOOGLE_MOBILE_CLIENT_IDS = 'shared.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_ID = 'shared.apps.googleusercontent.com'
    expect(allowedAudiences()).toEqual(['shared.apps.googleusercontent.com'])
  })
})
