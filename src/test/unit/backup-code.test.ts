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
});
