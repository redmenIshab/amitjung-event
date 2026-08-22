import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { rateLimit } from '@/lib/rateLimit'
import { MEDIA_PURPOSES, isMediaPurpose, isCloudinaryConfigured, signUpload } from '@/lib/cloudinary'

/**
 * Mint a short-lived signature for one direct browser upload to Cloudinary.
 *
 * Bytes never pass through this function: the browser posts the file straight
 * to Cloudinary with the signature below. That keeps the API secret server-side
 * while sidestepping the 4.5 MB body limit a proxied upload would hit — the
 * marketing showreel alone is 25 MB.
 *
 * The caller sends a `purpose`, never a folder. The purpose resolves to both
 * the required capability and the destination folder, and the folder is signed,
 * so an upload cannot be redirected somewhere the caller may not write.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request body' }, { status: 422 })
  }

  const purpose = (body as { purpose?: unknown } | null)?.purpose
  if (!isMediaPurpose(purpose)) {
    return NextResponse.json(
      { error: `Unknown upload purpose. Expected one of: ${Object.keys(MEDIA_PURPOSES).join(', ')}` },
      { status: 422 },
    )
  }

  const gate = await requireApiCapability(MEDIA_PURPOSES[purpose].capability)
  if (gate instanceof NextResponse) return gate

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: 'Media storage is not configured' }, { status: 503 })
  }

  // A signature is cheap to mint and expensive to hold: each one is an upload
  // billed to the account. Fails open when Upstash is unset, like every other
  // limit in this app.
  const limit = await rateLimit({
    key: `media-sign:${gate.session.user.id}`,
    limit: 60,
    windowSeconds: 300,
  })
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  return NextResponse.json(signUpload(purpose))
}
