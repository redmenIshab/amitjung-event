import { z } from 'zod'

/**
 * Media reference resolution — the client-safe half of the Cloudinary
 * integration.
 *
 * **This module must never import the `cloudinary` SDK.** It is bundled into
 * client components (`EventCard`, the marketing gallery), and the SDK is
 * configured from `CLOUDINARY_URL`, which embeds the API secret. Signing and
 * deletion live in `src/lib/cloudinary.ts`, which is server-only. This is the
 * same split as `eventScope.ts` (pure) vs `eventAccess.ts` (Prisma-backed) —
 * see ARCHITECTURE §15.13.
 *
 * The cloud name is read from `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` rather than
 * parsed out of `CLOUDINARY_URL`, because the browser cannot see the latter.
 */

export type MediaResourceType = 'image' | 'video'

export interface MediaUrlOptions {
  /** Delivered width in pixels. Omitted, the original width is served. */
  width?: number
  height?: number
  /** Cloudinary crop mode. Defaults to `fill` whenever a dimension is given. */
  crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'thumb'
  resourceType?: MediaResourceType
  /**
   * Explicit delivery format, e.g. `mp4`. Prefer this over relying on `f_auto`
   * for video: negotiation depends on the client's Accept header, and anything
   * that does not negotiate is served the original container — which for the
   * showreel means QuickTime.
   */
  format?: string
}

/** A value we already know how to serve: an absolute URL or a `/public` path. */
function isDirectlyServable(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/')
}

/**
 * Resolve a stored media reference to a URL.
 *
 * Values that are already URLs — every event poster and artist photo created
 * before this integration — pass through untouched, which is why adopting
 * Cloudinary needed no data migration. Anything else is treated as a
 * Cloudinary `public_id` and delivered with `f_auto,q_auto` so the format and
 * quality adapt to the requesting browser.
 *
 * Applied **at render only**. Resolving on the way into the database would
 * bake one transformation into stored data and destroy the passthrough.
 */
export function mediaUrl(
  value: string | null | undefined,
  options: MediaUrlOptions = {},
): string | null {
  if (!value) return null
  if (isDirectlyServable(value)) return value

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  // Unconfigured: hand back the raw value rather than a URL pointing at a
  // cloud that does not exist. The app must still run without Cloudinary.
  if (!cloudName) return value

  const { width, height, crop, resourceType = 'image', format } = options

  const transforms = ['f_auto', 'q_auto']
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (width || height) transforms.push(`c_${crop ?? 'fill'}`)

  const asset = format ? `${value}.${format}` : value
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transforms.join(',')}/${asset}`
}

/**
 * Characters Cloudinary allows in a public id, and nothing else. Deliberately
 * narrow: this value is interpolated into a delivery URL and rendered into an
 * `<img src>`, so anything resembling another scheme, a query string, or a
 * traversal segment must not validate.
 */
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_-]*(\.[A-Za-z0-9]+)?$/

/**
 * Accepts what the database may legitimately hold: a Cloudinary public id, a
 * legacy pasted URL, or the empty string the event form posts when no poster
 * is set.
 *
 * Replaces the `z.string().url()` rules that previously guarded
 * `Event.image` and `Artist.artistImage` — those predate uploads and reject
 * every public id, which would let an upload succeed at Cloudinary and then
 * 422 on save.
 */
export const mediaRefSchema = z
  .string()
  .refine(
    (v) => {
      if (v === '') return true
      if (/^https?:\/\//i.test(v)) return URL.canParse(v)
      // `..` would escape the folder the signature pinned.
      if (v.includes('..')) return false
      return PUBLIC_ID_PATTERN.test(v)
    },
    { message: 'Must be an uploaded image or a valid URL' },
  )
