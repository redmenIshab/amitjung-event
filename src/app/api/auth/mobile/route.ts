import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { allowedAudiences, signMobileToken, verifyGoogleIdToken } from '@/lib/mobileAuth'

/**
 * Mobile sign-in: Google ID token in, app bearer token out.
 *
 * The device performs Google sign-in natively and sends the resulting ID token
 * here. We verify it against Google's JWKS (signature, issuer, audience), then
 * upsert the `Participant` **exactly as the web `signIn` callback in
 * `src/lib/auth.ts` does** — same table, same keys — so a buyer who signs in on
 * the phone and on lyante.art is one account with one ticket history.
 *
 * Stateless by design: nothing is written to a session store, so it behaves
 * identically across Vercel lambda instances and cold starts.
 */

const bodySchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
})

export async function POST(request: Request) {
  // Misconfiguration must be loud: without an audience allow-list we would be
  // accepting Google tokens minted for *any* application.
  if (allowedAudiences().length === 0) {
    console.error('Mobile auth: GOOGLE_MOBILE_CLIENT_IDS / GOOGLE_CLIENT_ID are unset')
    return NextResponse.json(
      { error: 'Mobile sign-in is not configured on this server' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const identity = await verifyGoogleIdToken(parsed.data.idToken)
  if (!identity) {
    return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
  }

  // Mirrors the Google branch of the `signIn` callback in src/lib/auth.ts.
  // Keyed on email, like the web, so the same person resolves to one row
  // regardless of which client they signed in from first.
  const participant = await prisma.participant.upsert({
    where: { email: identity.email },
    update: { name: identity.name, image: identity.picture },
    create: {
      googleId: identity.googleId,
      email: identity.email,
      name: identity.name,
      image: identity.picture,
    },
    select: { id: true, name: true, email: true, image: true, deletedAt: true },
  })

  if (participant.deletedAt) {
    return NextResponse.json({ error: 'This account is no longer active' }, { status: 403 })
  }

  const token = await signMobileToken({
    participantId: participant.id,
    email: participant.email,
    name: participant.name,
  })

  return NextResponse.json({
    token,
    participantId: participant.id,
    name: participant.name,
    email: participant.email,
    image: participant.image,
  })
}
