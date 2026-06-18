import { describe, it, expect } from "vitest";
import { filterRemembranceNotes } from "@/lib/notes/remembrance";
import type { VaultIndexNoteEntry } from "@/lib/crypto-client/vault-index-types";

function entry(overrides: Partial<VaultIndexNoteEntry> = {}): VaultIndexNoteEntry {
  return {
    id: "n1",
    title: "Note",
    categoryId: null,
    tagIds: [],
    answered: true,
    pinned: false,
    favorite: false,
    archived: false,
    trashed: false,
    hasResolvedReflection: true,
    resolvedAt: "2026-06-10T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("remembrance filter", () => {
  it("includes only active resolved notes with reflection flag", () => {
    const results = filterRemembranceNotes([
      entry({ id: "keep" }),
      entry({ id: "no-reflection", hasResolvedReflection: false }),
      entry({ id: "unresolved", answered: false }),
      entry({ id: "trashed", trashed: true }),
      entry({ id: "archived", archived: true }),
    ]);
    expect(results.map((n) => n.id)).toEqual(["keep"]);
  });

  it("sorts by resolvedAt descending", () => {
    const results = filterRemembranceNotes([
      entry({ id: "older", resolvedAt: "2026-06-01T00:00:00.000Z" }),
      entry({ id: "newer", resolvedAt: "2026-06-15T00:00:00.000Z" }),
    ]);
    expect(results[0].id).toBe("newer");
  });
});
