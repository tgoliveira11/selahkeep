import { describe, it, expect } from "vitest";
import {
  normalizeNoteMetadata,
  metadataToIndexEntry,
  duplicateNoteTitle,
  duplicateNoteMetadata,
  DEFAULT_LIFECYCLE,
} from "@/lib/notes/note-metadata";

describe("note metadata normalization", () => {
  it("defaults lifecycle fields for legacy metadata", () => {
    const normalized = normalizeNoteMetadata({
      title: "Legacy",
      categoryId: null,
      tagIds: [],
      answered: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(normalized.pinned).toBe(DEFAULT_LIFECYCLE.pinned);
    expect(normalized.favorite).toBe(DEFAULT_LIFECYCLE.favorite);
    expect(normalized.archived).toBe(DEFAULT_LIFECYCLE.archived);
    expect(normalized.trashed).toBe(DEFAULT_LIFECYCLE.trashed);
    expect(normalized.trashedAt).toBeNull();
  });

  it("preserves explicit lifecycle fields", () => {
    const normalized = normalizeNoteMetadata({
      title: "Pinned",
      categoryId: "c1",
      tagIds: ["t1"],
      answered: false,
      pinned: true,
      favorite: true,
      archived: false,
      trashed: false,
      trashedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(normalized.pinned).toBe(true);
    expect(normalized.favorite).toBe(true);
  });

  it("maps metadata to index entry with checklist flag", () => {
    const entry = metadataToIndexEntry(
      "n1",
      normalizeNoteMetadata({
        title: "Tasks",
        categoryId: null,
        tagIds: [],
        answered: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
      "- [ ] Item"
    );
    expect(entry.hasChecklist).toBe(true);
    expect(entry.isDailyNote).toBe(false);
  });

  it("builds duplicate title", () => {
    expect(duplicateNoteTitle("Prayer")).toBe("Copy of Prayer");
    expect(duplicateNoteTitle("  ")).toBe("Copy of Untitled");
  });

  it("resets lifecycle on duplicate metadata", () => {
    const source = normalizeNoteMetadata({
      title: "Original",
      categoryId: "c1",
      tagIds: ["t1"],
      answered: true,
      pinned: true,
      favorite: true,
      archived: true,
      trashed: false,
      trashedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    const dup = duplicateNoteMetadata(source, "body", "2026-02-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z");
    expect(dup.title).toBe("Copy of Original");
    expect(dup.categoryId).toBe("c1");
    expect(dup.tagIds).toEqual(["t1"]);
    expect(dup.answered).toBe(false);
    expect(dup.pinned).toBe(false);
    expect(dup.favorite).toBe(false);
    expect(dup.archived).toBe(false);
    expect(dup.trashed).toBe(false);
  });
});
