import "server-only";
import { getPostgresClient } from "@/lib/db/postgres-client";
import type { RateLimitAdapter, RateLimitResult, RateLimitScope } from "../core/types";
import { buildRateLimitKey } from "../core/types";
import {
  isMissingRateLimitTableError,
  RateLimitStoreUnavailableError,
} from "../errors";

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

    const sql = getPostgresClient();
    let result: { count: number; reset_at: Date | string }[];
    try {
      // Use postgres-js directly — drizzle's db.execute does not serialize Date params for this driver.
      result = await sql`
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
      `;
    } catch (error) {
      if (isMissingRateLimitTableError(error)) {
        throw new RateLimitStoreUnavailableError(
          "rate_limit_buckets table is missing. Run `npm run db:migrate` (migration 0002_rate_limit_buckets.sql)."
        );
      }
      throw error;
    }

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
    const sql = getPostgresClient();
    await sql`DELETE FROM rate_limit_buckets WHERE bucket_key = ${key}`;
  }
}
