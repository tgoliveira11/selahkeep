import { describe, it, expect } from "vitest";
import { formatAutoLockCountdown } from "@/lib/notes/auto-lock-countdown";

describe("formatAutoLockCountdown", () => {
  it("formats minutes and seconds", () => {
    expect(formatAutoLockCountdown(14 * 60 * 1000 + 32 * 1000)).toBe("14:32");
    expect(formatAutoLockCountdown(65_000)).toBe("1:05");
    expect(formatAutoLockCountdown(500)).toBe("0:01");
  });
});
