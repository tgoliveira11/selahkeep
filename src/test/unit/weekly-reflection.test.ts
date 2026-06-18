import { describe, it, expect } from "vitest";
import {
  buildWeeklyReflectionNoteBody,
  buildWeeklyReflectionSections,
  getLocalWeekBounds,
  isDateInWeek,
  WEEKLY_REFLECTION_CATEGORY,
} from "@/lib/notes/weekly-reflection";
import type { VaultIndexNoteEntry, VaultCategory } from "@/lib/crypto-client/vault-index-types";

function entry(overrides: Partial<VaultIndexNoteEntry> = {}): VaultIndexNoteEntry {
  return {
    id: "n1",
    title: "Note",
    categoryId: null,
    tagIds: [],
    answered: false,
    pinned: false,
    favorite: false,
    archived: false,
    trashed: false,
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
    ...overrides,
  };
}

describe("weekly reflection", () => {
  const bounds = getLocalWeekBounds(new Date("2026-06-18T15:00:00"));

  it("uses Monday–Sunday local week bounds", () => {
    expect(bounds.start.getDay()).toBe(1);
    expect(bounds.end.getDay()).toBe(0);
    expect(bounds.label).toMatch(/–/);
  });

  it("checks date membership in week", () => {
    expect(isDateInWeek("2026-06-17T10:00:00.000Z", bounds)).toBe(true);
    expect(isDateInWeek("2026-05-01T10:00:00.000Z", bounds)).toBe(false);
  });

  it("builds sections from vault index", () => {
    const gratitudeId = "cat-gratitude";
    const categories: VaultCategory[] = [
      {
        id: gratitudeId,
        name: "Gratitude",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const entries = [
      entry({ id: "a", createdAt: "2026-06-17T10:00:00.000Z" }),
      entry({
        id: "b",
        answered: true,
        resolvedAt: "2026-06-17T11:00:00.000Z",
      }),
      entry({ id: "c", categoryId: gratitudeId }),
      entry({ id: "d", answered: false }),
      entry({ id: "e", archived: true, createdAt: "2026-06-17T10:00:00.000Z" }),
    ];
    const sections = buildWeeklyReflectionSections(entries, categories, bounds);
    expect(sections.createdThisWeek.map((n) => n.id)).toContain("a");
    expect(sections.resolvedThisWeek.map((n) => n.id)).toContain("b");
    expect(sections.gratitudeNotes.map((n) => n.id)).toContain("c");
    expect(sections.openReflections.map((n) => n.id)).toContain("d");
    expect(sections.createdThisWeek.map((n) => n.id)).not.toContain("e");
  });

  it("builds weekly reflection note body markdown", () => {
    const sections = {
      createdThisWeek: [entry({ title: "New prayer" })],
      resolvedThisWeek: [],
      gratitudeNotes: [],
      openReflections: [entry({ title: "Open" })],
    };
    const body = buildWeeklyReflectionNoteBody(sections, bounds);
    expect(body).toMatch(/Weekly Reflection/);
    expect(body).toContain("New prayer");
    expect(body).toContain("What should I carry forward?");
  });

  it("exports weekly reflection category constant", () => {
    expect(WEEKLY_REFLECTION_CATEGORY).toBe("Weekly Reflection");
  });
});
