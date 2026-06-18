import { describe, it, expect } from "vitest";
import { sortNotes } from "@/lib/notes/note-sort";
import type { NoteSearchResult } from "@/lib/crypto-client/note-search";

const notes: NoteSearchResult[] = [
  {
    id: "a",
    title: "Beta",
    answered: false,
    categoryId: null,
    tagIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
    categoryName: null,
    tagNames: [],
  },
  {
    id: "b",
    title: "Alpha",
    answered: true,
    categoryId: null,
    tagIds: [],
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    categoryName: null,
    tagNames: [],
  },
];

describe("sortNotes", () => {
  it("sorts by modified newest first", () => {
    expect(sortNotes(notes, "modified-desc").map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("sorts by modified oldest first", () => {
    expect(sortNotes(notes, "modified-asc").map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("sorts by created newest first", () => {
    expect(sortNotes(notes, "created-desc").map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("sorts by created oldest first", () => {
    expect(sortNotes(notes, "created-asc").map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("sorts by title Z-A", () => {
    expect(sortNotes(notes, "title-desc").map((n) => n.title)).toEqual(["Beta", "Alpha"]);
  });
});
