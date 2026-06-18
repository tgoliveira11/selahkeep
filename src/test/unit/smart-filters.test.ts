import { describe, it, expect } from "vitest";
import {
  matchesSmartFilter,
  isActiveNoteEntry,
  isRecentlyUpdated,
  DEFAULT_SMART_FILTER,
  SMART_FILTER_OPTIONS,
} from "@/lib/notes/smart-filters";
import type { VaultIndexNoteEntry } from "@/lib/crypto-client/vault-index-types";

const activeEntry: VaultIndexNoteEntry = {
  id: "a",
  title: "Active",
  categoryId: null,
  tagIds: [],
  answered: false,
  pinned: false,
  favorite: false,
  archived: false,
  trashed: false,
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: new Date().toISOString(),
  hasChecklist: false,
};

describe("smart local filters", () => {
  it("includes all active notes by default filter", () => {
    expect(DEFAULT_SMART_FILTER).toBe("all-active");
    expect(matchesSmartFilter(activeEntry, "all-active")).toBe(true);
  });

  it("excludes archived and trashed from active", () => {
    expect(isActiveNoteEntry({ ...activeEntry, archived: true })).toBe(false);
    expect(isActiveNoteEntry({ ...activeEntry, trashed: true })).toBe(false);
  });

  it("filters pinned and favorites", () => {
    expect(matchesSmartFilter({ ...activeEntry, pinned: true }, "pinned")).toBe(true);
    expect(matchesSmartFilter(activeEntry, "pinned")).toBe(false);
    expect(matchesSmartFilter({ ...activeEntry, favorite: true }, "favorites")).toBe(true);
  });

  it("filters resolved state", () => {
    expect(matchesSmartFilter({ ...activeEntry, answered: true }, "resolved")).toBe(true);
    expect(matchesSmartFilter(activeEntry, "unresolved")).toBe(true);
  });

  it("filters archived and trash separately", () => {
    expect(matchesSmartFilter({ ...activeEntry, archived: true }, "archived")).toBe(true);
    expect(matchesSmartFilter({ ...activeEntry, trashed: true }, "trash")).toBe(true);
    expect(matchesSmartFilter({ ...activeEntry, archived: true, trashed: true }, "archived")).toBe(false);
  });

  it("filters no category and no tags", () => {
    expect(matchesSmartFilter(activeEntry, "no-category")).toBe(true);
    expect(matchesSmartFilter({ ...activeEntry, categoryId: "c1" }, "no-category")).toBe(false);
    expect(matchesSmartFilter(activeEntry, "no-tags")).toBe(true);
    expect(matchesSmartFilter({ ...activeEntry, tagIds: ["t1"] }, "no-tags")).toBe(false);
  });

  it("filters checklist notes", () => {
    expect(matchesSmartFilter({ ...activeEntry, hasChecklist: true }, "checklist")).toBe(true);
    expect(matchesSmartFilter(activeEntry, "checklist")).toBe(false);
  });

  it("filters recently updated within seven days", () => {
    expect(isRecentlyUpdated(activeEntry)).toBe(true);
    expect(
      isRecentlyUpdated(
        { ...activeEntry, updatedAt: "2020-01-01T00:00:00.000Z" },
        Date.parse("2026-06-18T00:00:00.000Z")
      )
    ).toBe(false);
    expect(matchesSmartFilter(activeEntry, "recently-updated")).toBe(true);
  });

  it("filters daily notes by index flag", () => {
    expect(matchesSmartFilter({ ...activeEntry, isDailyNote: true }, "daily-notes")).toBe(true);
  });

  it("filters drafts by draft note id set", () => {
    expect(
      matchesSmartFilter(activeEntry, "drafts", { draftNoteIds: new Set(["a"]) })
    ).toBe(true);
    expect(matchesSmartFilter(activeEntry, "drafts", { draftNoteIds: new Set() })).toBe(false);
  });

  it("exposes all smart filter options", () => {
    expect(SMART_FILTER_OPTIONS.length).toBeGreaterThanOrEqual(11);
    expect(SMART_FILTER_OPTIONS.map((o) => o.value)).toContain("trash");
  });
});
