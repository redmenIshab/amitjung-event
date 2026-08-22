import 'server-only'
import { v2 as cloudinary } from 'cloudinary'
import type { Capability } from '@/lib/rbac'
import type { MediaResourceType } from '@/lib/media'

/**
 * Cloudinary signing and deletion. **Server only** — this module reads
 * `CLOUDINARY_URL`, which embeds the API secret. The client-safe resolver is
 * `src/lib/media.ts`; importing this one from a client component leaks the
 * secret into the browser bundle, which the `server-only` import above turns
 * from a silent disaster into a build failure.
 */

export interface MediaPurposeSpec {
  /** Checked with `requireApiCapability` before a signature is minted. */
  capability: Capability
  /** Signed into the upload, so the caller cannot redirect it elsewhere. */
  folder: string
  resourceTypes: readonly MediaResourceType[]
  /**
   * Advisory ceiling, enforced in the browser before upload.
   *
   * A Cloudinary signature can pin the folder, timestamp and public id but
   * **not** a byte cap, so a caller holding a valid signature can exceed this.
   * The real backstop is the account-level max-file-size in the Cloudinary
   * console — configuration that lives outside this repo.
   */
  maxBytes: number
}

const MB = 1024 * 1024

/**
 * The authorisation boundary for uploads.
 *
 * The client sends a `purpose`; the server resolves the folder. Accepting a
 * client-supplied folder instead would let anyone holding any upload
 * capability write anywhere in the account — a MANAGER with
 * `MARKETING_MANAGE` could overwrite a live event poster.
 */
export const MEDIA_PURPOSES = {
  event: {
    capability: 'EVENT_WRITE',
    folder: 'lyante/events',
    resourceTypes: ['image'],
    maxBytes: 10 * MB,
  },
  artist: {
    capability: 'ARTIST_MANAGE',
    folder: 'lyante/artists',
    resourceTypes: ['image'],
    maxBytes: 10 * MB,
  },
  gallery: {
    capability: 'MARKETING_MANAGE',
    folder: 'lyante/gallery',
    resourceTypes: ['image', 'video'],
    maxBytes: 200 * MB,
  },
} as const satisfies Record<string, MediaPurposeSpec>

export type MediaPurpose = keyof typeof MEDIA_PURPOSES

export function isMediaPurpose(value: unknown): value is MediaPurpose {
  return typeof value === 'string' && value in MEDIA_PURPOSES
}

interface CloudinaryCredentials {
  api_key: string
  api_secret: string
  cloud_name: string
}

/**
 * Parse `CLOUDINARY_URL` (`cloudinary://<key>:<secret>@<cloud>`) explicitly
 * rather than letting the SDK read the environment for us.
 *
 * The SDK caches whatever it parsed on first access in module state, so an
 * environment change afterwards is silently ignored. Reading it here on every
 * call keeps configuration honest and, incidentally, testable.
 */
function credentials(): CloudinaryCredentials | null {
  const raw = process.env.CLOUDINARY_URL
  if (!raw) return null

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== 'cloudinary:') return null

  const api_key = decodeURIComponent(parsed.username)
  const api_secret = decodeURIComponent(parsed.password)
  const cloud_name = parsed.hostname
  if (!api_key || !api_secret || !cloud_name) return null

  return { api_key, api_secret, cloud_name }
}

export function isCloudinaryConfigured(): boolean {
  return credentials() !== null
}

export interface SignedUpload {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
  resourceTypes: readonly MediaResourceType[]
  maxBytes: number
}

/**
 * Mint a short-lived signature for one direct browser upload.
 *
 * Only `folder` and `timestamp` are signed, so those are exactly the
 * parameters the browser must send — Cloudinary rejects the upload if the
 * signed set and the posted set disagree. The secret never leaves this
 * process.
 */
export function signUpload(purpose: MediaPurpose): SignedUpload {
  const creds = credentials()
  if (!creds) throw new Error('Cloudinary is not configured')
  const { api_key, api_secret, cloud_name } = creds

  const spec = MEDIA_PURPOSES[purpose]
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = cloudinary.utils.api_sign_request(
    { folder: spec.folder, timestamp },
    api_secret,
  )

  return {
    timestamp,
    signature,
    apiKey: api_key,
    cloudName: cloud_name,
    folder: spec.folder,
    resourceTypes: spec.resourceTypes,
    maxBytes: spec.maxBytes,
  }
}

/**
 * Permanently destroy an asset. Irreversible, and reached only from the
 * explicit "remove" action — never from a replace, because nothing guarantees
 * two records do not share a public id.
 */
export async function destroyAsset(
  publicId: string,
  resourceType: MediaResourceType = 'image',
): Promise<void> {
  const creds = credentials()
  if (!creds) return
  // Credentials are passed per call for the same reason they are parsed per
  // call: the SDK's global config is set once and never revisited.
  await cloudinary.uploader.destroy(publicId, {
    ...creds,
    resource_type: resourceType,
    invalidate: true,
  })
}
