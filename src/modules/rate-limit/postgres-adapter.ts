import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { RateLimitAdapter, RateLimitResult, RateLimitScope } from "./types";
import { buildRateLimitKey } from "./types";

/**
 * PostgreSQL-backed rate limit store for production deployments.
 * Uses atomic upsert so limits are shared across app instances.
 */
export class PostgresRateLimitAdapter implements RateLimitAdapter {
  async check(
    scope: RateLimitScope,
    maxAttempts: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const key = buildRateLimitKey(scope);
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);

    const result = await db.execute<{ count: number; reset_at: Date }>(sql`
      INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (bucket_key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_buckets.reset_at <= ${now} THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        reset_at = CASE
          WHEN rate_limit_buckets.reset_at <= ${now} THEN ${resetAt}
          ELSE rate_limit_buckets.reset_at
        END
      RETURNING count, reset_at
    `);

    const row = result[0];
    if (!row) return { allowed: true };

    const count = Number(row.count);
    const rowResetAt = row.reset_at instanceof Date ? row.reset_at : new Date(row.reset_at);

    if (count > maxAttempts) {
      return { allowed: false, retryAfterMs: Math.max(0, rowResetAt.getTime() - Date.now()) };
    }

    return { allowed: true };
  }

  async reset(scope: RateLimitScope): Promise<void> {
    const key = buildRateLimitKey(scope);
    await db.execute(sql`DELETE FROM rate_limit_buckets WHERE bucket_key = ${key}`);
  }
}
