import QRCode from 'qrcode'

export function buildVerifyUrl(token: string): string {
  // Priority: explicit app URL → Vercel deployment URL → localhost dev
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base}/ticket/${token}`
}

/**
 * Bound on the in-process QR cache.
 *
 * Each entry is ~3KB, so this caps the cache at roughly 1.5MB per instance —
 * cheap next to the repeated CPU it saves, and bounded so a long-lived
 * serverless instance cannot grow without limit.
 */
export const QR_CACHE_MAX = 500

/**
 * A ticket's QR is deterministic from its token, but "My Tickets" regenerated
 * every code on every request — measured at ~8ms each, so ~50ms of pure
 * repeated CPU for a six-ticket page.
 *
 * Memoised in process rather than in Redis on purpose: a Redis round trip costs
 * about as much as encoding the QR, so it would buy nothing.
 */
const qrCache = new Map<string, string>()

/** Exposed for tests; nothing in the app should need to clear this. */
export function __resetQrCache() {
  qrCache.clear()
}

export async function generateQRCodeDataURL(text: string): Promise<string> {
  const hit = qrCache.get(text)
  if (hit !== undefined) {
    // Refresh recency so the hottest tickets survive eviction.
    qrCache.delete(text)
    qrCache.set(text, hit)
    return hit
  }

  // Awaited before caching, so a failed encode is never memoised.
  const dataUrl = await QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  if (qrCache.size >= QR_CACHE_MAX) {
    // Map iterates in insertion order, so the first key is the least recently
    // used given the refresh above.
    const oldest = qrCache.keys().next().value
    if (oldest !== undefined) qrCache.delete(oldest)
  }
  qrCache.set(text, dataUrl)

  return dataUrl
}
