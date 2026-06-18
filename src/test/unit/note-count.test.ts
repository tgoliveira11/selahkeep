import { describe, it, expect } from "vitest";
import { formatNoteCount } from "@/lib/notes/note-count";

describe("formatNoteCount", () => {
  it("shows total when unfiltered", () => {
    expect(formatNoteCount(12, 12)).toBe("12 notes");
    expect(formatNoteCount(1, 1)).toBe("1 note");
  });

  it("shows filtered of total when filtered", () => {
    expect(formatNoteCount(4, 12)).toBe("4 of 12 notes");
    expect(formatNoteCount(1, 5)).toBe("1 of 5 notes");
  });
});
