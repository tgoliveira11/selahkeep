import { describe, it, expect } from "vitest";
import {
  extractSearchSnippet,
  matchNoteText,
  stripMarkdownForSnippet,
} from "@/lib/notes/note-text-search";

describe("note text search", () => {
  it("matches title category tags and body", () => {
    const title = matchNoteText("peace", { title: "Morning peace", categoryName: "Prayer", tagNames: ["faith"] });
    expect(title.matches).toBe(true);

    const body = matchNoteText("secret", {
      title: "Note",
      body: "This is a **secret** thought",
    });
    expect(body.matches).toBe(true);
    expect(body.matchedFields).toContain("body");
  });

  it("requires all terms for multi-term search", () => {
    const match = matchNoteText("morning peace", {
      title: "Morning reflection",
      body: "peaceful day",
    });
    expect(match.matches).toBe(true);

    const miss = matchNoteText("morning ocean", {
      title: "Morning reflection",
      body: "peaceful day",
    });
    expect(miss.matches).toBe(false);
  });

  it("extracts body snippet around match", () => {
    const snippet = extractSearchSnippet(
      "Long intro text before the hidden treasure appears in the note body.",
      "treasure"
    );
    expect(snippet).toMatch(/treasure/i);
  });

  it("strips markdown and unsafe tags from snippets", () => {
    const plain = stripMarkdownForSnippet('# Title\n\n<script>alert(1)</script>\n\n**bold**');
    expect(plain).not.toContain("<script");
    expect(plain).toContain("bold");
  });
});
