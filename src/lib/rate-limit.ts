/**
 * Fixed-window rate limiter backed by Cloudflare KV.
 *
 * Each key gets a counter that resets at the start of every window.
 * The KV entry TTL is set to the window duration so stale keys expire
 * automatically without any cleanup work.
 *
 * Usage:
 *   const result = await rateLimit(kv, `ingest:${apiId}`, { limit: 60, windowSecs: 3600 });
 *   if (!result.allowed) return 429;
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds) when the window resets
}

export interface RateLimitOptions {
  /** Maximum requests allowed per window. */
  limit: number;
  /** Window duration in seconds. */
  windowSecs: number;
}

export async function rateLimit(
  kv: KVNamespace,
  key: string,
  { limit, windowSecs }: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  // Align to fixed windows (e.g. every hour on the hour)
  const windowStart = now - (now % windowSecs);
  const resetAt = windowStart + windowSecs;
  const kvKey = `${key}:${windowStart}`;

  const raw = await kv.get(kvKey);
  const count = raw !== null ? parseInt(raw, 10) : 0;

  if (count >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  // Increment; TTL is set to window duration + 10s buffer so it expires naturally
  await kv.put(kvKey, String(count + 1), { expirationTtl: windowSecs + 10 });

  return { allowed: true, remaining: limit - count - 1, resetAt };
}
