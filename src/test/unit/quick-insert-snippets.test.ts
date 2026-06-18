import { describe, it, expect } from "vitest";
import {
  getQuickInsertSnippet,
  insertSnippetIntoMarkdown,
  QUICK_INSERT_ITEMS,
} from "@/lib/notes/quick-insert-snippets";

describe("quick insert snippets", () => {
  it("includes required insert items", () => {
    const ids = QUICK_INSERT_ITEMS.map((item) => item.id);
    expect(ids).toContain("heading");
    expect(ids).toContain("checklist");
    expect(ids).toContain("divider");
    expect(ids).toContain("prayer-section");
    expect(ids).toContain("decision-block");
  });

  it("divider snippet is markdown horizontal rule", () => {
    expect(getQuickInsertSnippet("divider")).toBe("---\n\n");
  });

  it("inserts snippet into markdown at selection", () => {
    const { next, cursor } = insertSnippetIntoMarkdown("Hello", "## Prayer\n\n", 5, 5, 5000);
    expect(next).toContain("Hello\n## Prayer");
    expect(cursor).toBeGreaterThan(5);
  });
});
