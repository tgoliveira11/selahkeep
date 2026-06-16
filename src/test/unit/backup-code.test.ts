import { describe, it, expect } from "vitest";
import {
  generateBackupCodes,
  hashBackupCode,
  normalizeBackupCode,
} from "@/server/policies/backup-code";

describe("backup code policy", () => {
  it("generates formatted backup codes", () => {
    const codes = generateBackupCodes(3);
    expect(codes).toHaveLength(3);
    expect(codes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it("hashes backup codes consistently", () => {
    const hash = hashBackupCode("ABCD-EF12-3456");
    expect(hash).toBe(hashBackupCode(normalizeBackupCode("abcd ef12 3456")));
  });

  it("requires TWO_FACTOR_SECRET_ENCRYPTION_KEY to hash backup codes", () => {
    const original = process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY;
    delete process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY;
    try {
      expect(() => hashBackupCode("ABCD-EF12-3456")).toThrow(/TWO_FACTOR_SECRET_ENCRYPTION_KEY/);
    } finally {
      process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY = original;
    }
  });
});
