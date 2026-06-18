import { describe, it, expect } from "vitest";
import { formatNoteListDates } from "@/lib/notes/note-dates";

describe("formatNoteListDates", () => {
  it("shows both created and updated when on the same day", () => {
    const label = formatNoteListDates("2026-01-15T12:00:00.000Z", "2026-01-15T18:00:00.000Z");
    expect(label).toMatch(/^Created /);
    expect(label).toContain("Updated");
    expect(label).toContain("·");
  });

  it("shows created and updated when different days", () => {
    const label = formatNoteListDates("2026-01-01T00:00:00.000Z", "2026-01-15T00:00:00.000Z");
    expect(label).toContain("Created");
    expect(label).toContain("Updated");
    expect(label).toContain("·");
  });
});
