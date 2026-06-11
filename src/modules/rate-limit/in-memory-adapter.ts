import type { RateLimitAdapter, RateLimitResult, RateLimitScope } from "./types";
import { buildRateLimitKey } from "./types";

const buckets = new Map<string, { count: number; resetAt: number }>();

export class InMemoryRateLimitAdapter implements RateLimitAdapter {
  async check(
    scope: RateLimitScope,
    maxAttempts: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const key = buildRateLimitKey(scope);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }

    if (bucket.count >= maxAttempts) {
      return { allowed: false, retryAfterMs: bucket.resetAt - now };
    }

    bucket.count += 1;
    return { allowed: true };
  }

  async reset(scope: RateLimitScope): Promise<void> {
    buckets.delete(buildRateLimitKey(scope));
  }
}

/** Test-only helper to clear all in-memory buckets. */
export function resetAllInMemoryRateLimits(): void {
  buckets.clear();
}
