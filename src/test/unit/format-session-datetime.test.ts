import { describe, it, expect, vi, afterEach } from "vitest";
import { formatSessionDateTime } from "@/lib/ui/format-session-datetime";

describe("formatSessionDateTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats same-day timestamps as today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T15:00:00Z"));
    const iso = "2026-06-10T14:32:00Z";
    expect(formatSessionDateTime(iso)).toMatch(/^today at /);
  });

  it("returns Unknown for invalid dates", () => {
    expect(formatSessionDateTime("not-a-date")).toBe("Unknown");
  });
});
