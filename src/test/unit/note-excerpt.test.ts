import { describe, it, expect } from "vitest";
import { extractNoteExcerpt } from "@/lib/notes/note-excerpt";

describe("extractNoteExcerpt", () => {
  it("returns null for empty body", () => {
    expect(extractNoteExcerpt("   ")).toBeNull();
  });

  it("strips markdown and returns 120-180 char excerpt", () => {
    const body = `# Heading\n\n${"word ".repeat(40)}`;
    const excerpt = extractNoteExcerpt(body);
    expect(excerpt).toBeTruthy();
    expect(excerpt!.length).toBeLessThanOrEqual(181);
    expect(excerpt).not.toContain("#");
  });
});
