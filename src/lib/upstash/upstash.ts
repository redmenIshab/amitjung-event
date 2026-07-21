import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_URL;
const token = process.env.UPSTASH_TOKEN;

/**
 * True only when Upstash REST credentials are present. When false, the cache
 * and queue layers no-op and callers fall back to direct database reads, so the
 * app works without Redis configured (e.g. local dev without an Upstash instance).
 */
export const isRedisConfigured = Boolean(url && token);

// A placeholder URL keeps the constructor happy when unconfigured; it is never
// called because every consumer guards on `isRedisConfigured` first.
export const redisConfig = new Redis({
  url: url ?? 'https://placeholder.invalid',
  token: token ?? 'placeholder',
});
