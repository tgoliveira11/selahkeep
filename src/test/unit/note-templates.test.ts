import { describe, it, expect } from "vitest";
import { NOTE_TEMPLATES, getNoteTemplate } from "@/lib/notes/note-templates";
import { RESOLVED_COPY, isNoteResolved } from "@/lib/notes/resolved-labels";

describe("note templates", () => {
  it("includes required starter templates", () => {
    const ids = NOTE_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(["blank", "prayer", "reflection", "gratitude", "decision", "checklist"]);
  });

  it("prayer template includes markdown headings", () => {
    expect(getNoteTemplate("prayer").body).toContain("## Prayer");
  });

  it("checklist template includes task list markers", () => {
    expect(getNoteTemplate("checklist").body).toContain("- [ ]");
  });
});

describe("resolved labels", () => {
  it("maps internal answered flag to resolved display", () => {
    expect(isNoteResolved(true)).toBe(true);
    expect(RESOLVED_COPY.markResolved).toBe("Mark as resolved");
  });
});
