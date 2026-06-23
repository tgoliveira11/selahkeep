import { describe, it, expect } from "vitest";
import { formatRelativeNoteDateTime } from "@/lib/notes/note-dates";

describe("formatRelativeNoteDateTime", () => {
  it("labels same-day timestamps as Today", () => {
    const now = new Date("2026-06-23T15:00:00.000Z");
    const iso = new Date(now);
    iso.setHours(9, 12, 0, 0);
    const label = formatRelativeNoteDateTime(iso.toISOString(), now);
    expect(label.startsWith("Today,")).toBe(true);
  });
});
