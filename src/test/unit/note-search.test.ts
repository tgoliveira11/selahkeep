import { describe, it, expect, beforeEach } from "vitest";
import {
  createEmptyVaultIndex,
  addVaultIndexEntry,
  addVaultCategory,
  addVaultTag,
} from "@/lib/crypto-client/vault-index";
import {
  searchVaultIndex,
  searchVaultIndexWhenLocked,
} from "@/lib/crypto-client/note-search";

describe("note search and filters", () => {
  let index = createEmptyVaultIndex();

  beforeEach(() => {
    index = createEmptyVaultIndex();
    const cat = addVaultCategory(index, "Prayer").index;
    const tagResult = addVaultTag(cat, "gratitude");
    index = tagResult.index;
    const categoryId = index.categories[0]!.id;
    const tagId = index.tags[0]!.id;

    index = addVaultIndexEntry(index, {
      id: "n1",
      title: "Morning reflection",
      categoryId,
      tagIds: [tagId],
      answered: true,
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    index = addVaultIndexEntry(index, {
      id: "n2",
      title: "Evening note",
      categoryId: null,
      tagIds: [],
      answered: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns no results when vault is locked", () => {
    expect(searchVaultIndexWhenLocked()).toEqual([]);
  });

  it("searches title, category, and tag names", () => {
    expect(searchVaultIndex(index, { search: "morning" }).map((n) => n.id)).toEqual(["n1"]);
    expect(searchVaultIndex(index, { search: "prayer" }).map((n) => n.id)).toEqual(["n1"]);
    expect(searchVaultIndex(index, { search: "gratitude" }).map((n) => n.id)).toEqual(["n1"]);
  });

  it("filters by category, tag, and answered status", () => {
    const categoryId = index.categories[0]!.id;
    const tagId = index.tags[0]!.id;

    expect(searchVaultIndex(index, { categoryId }).map((n) => n.id)).toEqual(["n1"]);
    expect(searchVaultIndex(index, { categoryId: null }).map((n) => n.id)).toEqual(["n2"]);
    expect(searchVaultIndex(index, { tagId }).map((n) => n.id)).toEqual(["n1"]);
    expect(searchVaultIndex(index, { answered: "answered" }).map((n) => n.id)).toEqual(["n1"]);
    expect(searchVaultIndex(index, { answered: "unanswered" }).map((n) => n.id)).toEqual(["n2"]);
  });
});
