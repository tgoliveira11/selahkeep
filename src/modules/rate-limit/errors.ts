export class RateLimitStoreUnavailableError extends Error {
  constructor(message = "Rate limit store is not available. Run database migrations.") {
    super(message);
    this.name = "RateLimitStoreUnavailableError";
  }
}

export function isMissingRateLimitTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; cause?: { code?: string } };
  if (e.code === "42P01" || e.cause?.code === "42P01") return true;
  return typeof e.message === "string" && /rate_limit_buckets.*does not exist/i.test(e.message);
}
