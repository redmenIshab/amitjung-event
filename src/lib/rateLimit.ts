import { redisConfig, isRedisConfigured } from '@/lib/upstash/upstash'

/**
 * Fixed-window rate limiting on the Upstash client the app already uses.
 *
 * Built on `incr` + `expire` rather than pulling in `@upstash/ratelimit`: the
 * dependency buys sliding windows and analytics this app has no use for, and a
 * fixed window is enough to stop scripted abuse of the public endpoints.
 *
 * **Fails open.** When Upstash is unconfigured or unreachable, requests are
 * allowed. That matches the codebase's rule that the app must run without Redis
 * (ARCHITECTURE §15.7) — the alternative is a Redis outage taking down
 * registration and sign-in. The trade-off is real: with Upstash unset there is
 * no limiting at all, so it must be configured in production for these limits
 * to mean anything.
 */

const KEY_PREFIX = 'ratelimit:v1'

export interface RateLimitResult {
  ok: boolean
  remaining: number
  /** Seconds until the window resets. Suitable for a Retry-After header. */
  retryAfterSeconds: number
}

export interface RateLimitOptions {
  /** Identifies the caller and the action, e.g. `register:1.2.3.4`. */
  key: string
  /** Requests permitted per window. */
  limit: number
  windowSeconds: number
}

export async function rateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const allow: RateLimitResult = { ok: true, remaining: limit, retryAfterSeconds: 0 }
  if (!isRedisConfigured) return allow

  const redisKey = `${KEY_PREFIX}:${key}`

  try {
    const count = await redisConfig.incr(redisKey)

    // Only on the first hit: re-setting the TTL on every request would push the
    // window forward indefinitely and the counter would never reset.
    if (count === 1) {
      await redisConfig.expire(redisKey, windowSeconds)
    }

    if (count > limit) {
      return { ok: false, remaining: 0, retryAfterSeconds: windowSeconds }
    }

    return { ok: true, remaining: Math.max(0, limit - count), retryAfterSeconds: 0 }
  } catch (err) {
    // Never let a cache outage become an outage of the endpoint itself.
    console.error('[rateLimit]', err)
    return allow
  }
}

/**
 * Best-effort client address.
 *
 * Behind Vercel, `x-forwarded-for` is a comma-separated chain with the original
 * client first. These headers are spoofable in general, which is why this is
 * used for rate limiting and never for authorization.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** 429 body + Retry-After, shaped like the app's other error responses. */
export function tooManyRequests(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again shortly.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds),
      },
    },
  )
}
