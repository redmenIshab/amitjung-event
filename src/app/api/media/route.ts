import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { MEDIA_PURPOSES, isMediaPurpose, destroyAsset, type MediaPurpose } from '@/lib/cloudinary'

/**
 * Permanently destroy an uploaded asset.
 *
 * Reached only from the explicit "remove" control — replacing an image never
 * deletes the old one, because nothing guarantees two records do not reference
 * the same public id, and a wrong guess here blanks a live event's poster with
 * no way back.
 */

/** Clears the column a purpose owns. `null` for purposes with no DB record. */
const CLEAR_RECORD: Record<MediaPurpose, ((recordId: string) => Promise<unknown>) | null> = {
  event: (id) => prisma.event.update({ where: { id }, data: { image: null } }),
  // artistImage is non-nullable; the form requires a value again before save.
  artist: (id) => prisma.artist.update({ where: { id }, data: { artistImage: '' } }),
  // Gallery assets are referenced from source constants, not from a row.
  gallery: null,
}

export async function DELETE(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request body' }, { status: 422 })
  }

  const { purpose, publicId, recordId } = (body ?? {}) as {
    purpose?: unknown
    publicId?: unknown
    recordId?: unknown
  }

  if (!isMediaPurpose(purpose)) {
    return NextResponse.json({ error: 'Unknown upload purpose' }, { status: 422 })
  }

  const gate = await requireApiCapability(MEDIA_PURPOSES[purpose].capability)
  if (gate instanceof NextResponse) return gate

  const spec = MEDIA_PURPOSES[purpose]

  /**
   * The purpose gates the capability, so the public id must be confined to
   * that purpose's folder too. Without this, a MARKETING_MANAGE holder could
   * send `purpose: 'gallery'` with an event poster's id and destroy media they
   * have no right to touch — the capability check would pass, because it only
   * ever saw the purpose.
   */
  if (typeof publicId !== 'string' || !publicId.startsWith(`${spec.folder}/`)) {
    return NextResponse.json(
      { error: 'Asset does not belong to this purpose' },
      { status: 422 },
    )
  }

  /**
   * Clear the reference first, destroy second. The reverse order leaves a
   * window — and, if the staffer navigates away without saving, a permanent
   * state — where a stored row points at an asset that no longer exists.
   */
  if (typeof recordId === 'string' && recordId) {
    const clear = CLEAR_RECORD[purpose]
    if (clear) await clear(recordId)
  }

  await destroyAsset(publicId, spec.resourceTypes[0])

  return NextResponse.json({ ok: true })
}
