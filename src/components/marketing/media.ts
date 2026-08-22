import { mediaUrl } from '@/lib/media'

/**
 * Marketing media lives in Cloudinary under `lyante/gallery` — see
 * `scripts/upload-media.ts`, which put it there and can be re-run idempotently.
 *
 * The showreel is requested as explicit mp4 rather than through `f_auto`
 * content negotiation. The source is a QuickTime `.mov`, and anything that
 * fails to negotiate is served that container back — which Firefox largely
 * refuses to play.
 */
export const SHOWREEL_PUBLIC_ID = 'lyante/gallery/showreel'

export const showreelUrl = () =>
  mediaUrl(SHOWREEL_PUBLIC_ID, { resourceType: 'video', format: 'mp4' }) ?? ''
