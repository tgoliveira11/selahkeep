import { describe, expect, it } from "vitest";
import {
  isMissingRateLimitTableError,
  RateLimitStoreUnavailableError,
} from "@/modules/rate-limit/errors";

describe("rate limit errors", () => {
  it("detects missing rate_limit_buckets table", () => {
    expect(
      isMissingRateLimitTableError(
        Object.assign(new Error('relation "rate_limit_buckets" does not exist'), { code: "42P01" })
      )
    ).toBe(true);
    expect(isMissingRateLimitTableError(new Error("other"))).toBe(false);
  });

  it("names RateLimitStoreUnavailableError for apiError mapping", () => {
    const error = new RateLimitStoreUnavailableError();
    expect(error.name).toBe("RateLimitStoreUnavailableError");
  });
});
