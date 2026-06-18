import { describe, it, expect } from "vitest";
import { defaultNoteFilters } from "@/features/notes/note-filters";
import {
  hasActiveNoteFilters,
  shouldShowNotesListControls,
} from "@/lib/notes/notes-list-controls-visibility";

describe("notes list controls visibility", () => {
  it("hides controls when there are no organizers and zero notes", () => {
    expect(
      shouldShowNotesListControls({
        hasOrganizers: false,
        totalNotes: 0,
        smartFilter: "all-active",
        filters: defaultNoteFilters,
        hasSavedViews: false,
      })
    ).toBe(false);
  });

  it("shows controls when there is at least one note", () => {
    expect(
      shouldShowNotesListControls({
        hasOrganizers: false,
        totalNotes: 1,
        smartFilter: "all-active",
        filters: defaultNoteFilters,
        hasSavedViews: false,
      })
    ).toBe(true);
  });

  it("shows controls when categories or tags exist", () => {
    expect(
      shouldShowNotesListControls({
        hasOrganizers: true,
        totalNotes: 0,
        smartFilter: "all-active",
        filters: defaultNoteFilters,
        hasSavedViews: false,
      })
    ).toBe(true);
  });

  it("shows controls when a smart filter is active", () => {
    expect(
      shouldShowNotesListControls({
        hasOrganizers: false,
        totalNotes: 1,
        smartFilter: "pinned",
        filters: defaultNoteFilters,
        hasSavedViews: false,
      })
    ).toBe(true);
  });

  it("detects active search/filter state", () => {
    expect(hasActiveNoteFilters(defaultNoteFilters)).toBe(false);
    expect(
      hasActiveNoteFilters({ ...defaultNoteFilters, search: "prayer" })
    ).toBe(true);
  });
});
