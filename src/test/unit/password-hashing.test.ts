import { describe, it, expect } from "vitest";
import {
  assertPasswordHashFormat,
  hashPassword,
  verifyPassword,
  BCRYPT_COST,
} from "@/server/policies/password-hashing";

const SAMPLE_BCRYPT_HASH =
  "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

describe("password hashing policy", () => {
  it("uses bcrypt cost factor 12", () => {
    expect(BCRYPT_COST).toBe(12);
  });

  it("accepts bcrypt digests only", () => {
    expect(() => assertPasswordHashFormat(SAMPLE_BCRYPT_HASH)).not.toThrow();
    expect(() => assertPasswordHashFormat("plaintext-password")).toThrow(
      /bcrypt digest/
    );
  });

  it("hashes and verifies credentials passwords", async () => {
    const passwordHash = await hashPassword("correct-horse-battery-staple");
    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
    await expect(verifyPassword("correct-horse-battery-staple", passwordHash)).resolves.toBe(
      true
    );
    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(false);
  });
});
