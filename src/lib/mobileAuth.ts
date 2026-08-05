import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose'
import type { Session } from 'next-auth'

/**
 * Bearer-token authentication for the mobile app.
 *
 * The website authenticates with a NextAuth **cookie**, which a native app has
 * no access to. Mobile therefore signs in with Google natively, posts the
 * resulting Google ID token to `/api/auth/mobile`, and receives an app token it
 * sends as `Authorization: Bearer` on every later request. Both paths land on
 * the same `Participant` row, so the app and the website share one account and
 * one database — which is the whole point of the integration.
 *
 * Scope is deliberately narrow: a mobile token only ever resolves to a
 * PARTICIPANT. It can never carry a staff role, so it cannot reach the Control
 * Center even if the token leaks. `requireApiCapability` does not consult
 * bearer tokens at all (see rbac.ts).
 *
 * ── Serverless notes (Vercel) ───────────────────────────────────────────────
 * Everything here is stateless: no sessions to store, no sticky instances
 * required. `createRemoteJWKSet` keeps Google's signing keys in module scope,
 * which on Vercel means a per-instance cache that survives warm invocations and
 * re-fetches after a cold start — exactly the behaviour you want, and it never
 * blocks on a cache miss for longer than one HTTPS round trip.
 */

/** 30 days. The app stores this in SecureStore and re-authenticates when it expires. */
const TOKEN_TTL = '30d'

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

/** Module-scope so warm lambdas reuse Google's fetched keys. */
const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

function appSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is required to sign mobile tokens')
  return new TextEncoder().encode(secret)
}

/**
 * OAuth client IDs allowed to mint a session, comma-separated in
 * `GOOGLE_MOBILE_CLIENT_IDS` (the iOS and Android client IDs).
 *
 * This is the audience check, and it is the thing standing between "a Google
 * token" and "a Google token issued for *this* app" — a token minted for some
 * other application must not be accepted here. Falls back to the web client so
 * a single-client setup still works.
 */
export function allowedAudiences(): string[] {
  const ids = (process.env.GOOGLE_MOBILE_CLIENT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const web = process.env.GOOGLE_CLIENT_ID
  if (web) ids.push(web)
  return [...new Set(ids)]
}

export interface GoogleIdentity {
  googleId: string
  email: string
  name: string
  picture: string
}

/**
 * Verifies a Google ID token's signature, issuer and audience.
 * Returns null on any failure — callers must treat that as 401.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity | null> {
  const audience = allowedAudiences()
  if (audience.length === 0) return null

  try {
    const { payload } = await jwtVerify(idToken, googleJwks, {
      issuer: GOOGLE_ISSUERS,
      audience,
    })

    // Google sets email_verified false for some federated accounts; refuse
    // those rather than bind an unverified address to an account.
    if (payload.email_verified === false) return null
    const email = typeof payload.email === 'string' ? payload.email : ''
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    if (!email || !sub) return null

    return {
      googleId: sub,
      email,
      name: typeof payload.name === 'string' ? payload.name : email.split('@')[0],
      picture: typeof payload.picture === 'string' ? payload.picture : '',
    }
  } catch {
    return null
  }
}

export interface MobileClaims {
  participantId: string
  email: string
  name: string
}

/**
 * Issues the app's own bearer token.
 *
 * Carries email and name as claims. That is not decoration: `/api/tickets/mine`
 * also matches tickets by `session.user.email` (how admin-issued tickets reach
 * a buyer), so a session without one would silently hide those tickets. Putting
 * them in the token keeps every authenticated request free of an extra DB round
 * trip, which matters per-invocation on serverless.
 */
export async function signMobileToken(claims: MobileClaims): Promise<string> {
  return new SignJWT({ pid: claims.participantId, email: claims.email, name: claims.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.participantId)
    .setIssuedAt()
    // Asserted on the way back in, so a token minted by any other part of the
    // system can never be replayed as a mobile session.
    .setIssuer('lyante-mobile')
    .setExpirationTime(TOKEN_TTL)
    .sign(appSecret())
}

/** Claims from a valid app token, or null. */
export async function verifyMobileToken(token: string): Promise<MobileClaims | null> {
  try {
    const { payload } = await jwtVerify(token, appSecret(), { issuer: 'lyante-mobile' })
    const pid = typeof payload.pid === 'string' ? payload.pid : null
    if (!pid || pid !== payload.sub) return null
    return {
      participantId: pid,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
    }
  } catch {
    return null
  }
}

/**
 * Resolves a `Session`-shaped object from an `Authorization: Bearer` header, or
 * null when absent/invalid.
 *
 * Takes the `Request` rather than reading `next/headers`: this module is
 * reachable from `rbac.ts`, which middleware and client components also import,
 * and `next/headers` does not exist in either — importing it there fails the
 * build outright. Route handlers always receive the Request, so this costs
 * nothing.
 */
export async function sessionFromBearer(request: Request): Promise<Session | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null

  const claims = await verifyMobileToken(auth.slice(7).trim())
  if (!claims) return null

  // Deliberately hard-coded PARTICIPANT: a bearer token never confers staff access.
  return {
    user: {
      id: claims.participantId,
      email: claims.email,
      name: claims.name,
      role: 'PARTICIPANT',
    },
    expires: '',
  } as Session
}
