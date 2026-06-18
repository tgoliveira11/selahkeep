import { describe, it, expect } from "vitest";
import {
  findDailyNoteIdForDate,
  formatDailyNoteTitle,
  isDailyNoteTitle,
} from "@/lib/notes/daily-note";

describe("daily note helpers", () => {
  it("formats daily note title with ISO date", () => {
    const title = formatDailyNoteTitle(new Date("2026-06-16T12:00:00.000Z"));
    expect(title).toBe("Daily note — 2026-06-16");
    expect(isDailyNoteTitle(title)).toBe(true);
  });

  it("finds existing daily note in index entries", () => {
    const id = findDailyNoteIdForDate(
      [
        {
          id: "note-1",
          title: "Daily note — 2026-06-16",
          categoryId: null,
          tagIds: [],
          answered: false,
          createdAt: "2026-06-16T08:00:00.000Z",
          updatedAt: "2026-06-16T08:00:00.000Z",
        },
        {
          id: "note-2",
          title: "Other note",
          categoryId: null,
          tagIds: [],
          answered: false,
          createdAt: "2026-06-15T08:00:00.000Z",
          updatedAt: "2026-06-15T08:00:00.000Z",
        },
      ],
      new Date("2026-06-16T15:00:00.000Z")
    );
    expect(id).toBe("note-1");
  });

  it("returns null when no daily note exists for date", () => {
    expect(
      findDailyNoteIdForDate(
        [
          {
            id: "note-2",
            title: "Daily note — 2026-06-15",
            categoryId: null,
            tagIds: [],
            answered: false,
            createdAt: "2026-06-15T08:00:00.000Z",
            updatedAt: "2026-06-15T08:00:00.000Z",
          },
        ],
        new Date("2026-06-16T15:00:00.000Z")
      )
    ).toBeNull();
  });
});
