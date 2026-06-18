import { describe, it, expect } from "vitest";
import { createEmptyVaultIndex, addVaultIndexEntry } from "@/lib/crypto-client/vault-index";
import {
  getRecentlyViewedNoteIds,
  recordRecentlyViewed,
  resolveRecentlyViewedEntries,
} from "@/lib/notes/recently-viewed";

describe("recently viewed notes", () => {
  it("records most recent first and deduplicates", () => {
    let index = createEmptyVaultIndex();
    index = addVaultIndexEntry(index, {
      id: "a",
      title: "A",
      categoryId: null,
      tagIds: [],
      answered: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    index = addVaultIndexEntry(index, {
      id: "b",
      title: "B",
      categoryId: null,
      tagIds: [],
      answered: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    index = recordRecentlyViewed(index, "a", "2026-01-02T00:00:00.000Z");
    index = recordRecentlyViewed(index, "b", "2026-01-03T00:00:00.000Z");
    index = recordRecentlyViewed(index, "a", "2026-01-04T00:00:00.000Z");

    expect(getRecentlyViewedNoteIds(index)).toEqual(["a", "b"]);
    expect(resolveRecentlyViewedEntries(index).map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});
