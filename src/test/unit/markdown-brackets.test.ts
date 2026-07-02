import { describe, expect, it } from "vitest";
import { unescapeMarkdownBracketTags } from "@/lib/notes/markdown-brackets";
import { parseTitleTags } from "@/lib/notes/kanban-card-text";

describe("markdown-brackets", () => {
  it("unescapes bracket tags produced by the visual markdown serializer", () => {
    expect(unescapeMarkdownBracketTags("- [ ] \\[IN PROGRESS\\] task2")).toBe(
      "- [ ] [IN PROGRESS] task2"
    );
    expect(unescapeMarkdownBracketTags("notes \\[LOW\\] and \\[2026-07-02\\]")).toBe(
      "notes [LOW] and [2026-07-02]"
    );
  });

  it("leaves checklist markers unchanged", () => {
    expect(unescapeMarkdownBracketTags("- [ ] open\n- [x] done")).toBe(
      "- [ ] open\n- [x] done"
    );
  });
});

describe("parseTitleTags with escaped brackets", () => {
  const columns = [
    { id: "todo", title: "To Do", order: 0, isDoneColumn: false },
    { id: "doing", title: "In Progress", order: 1, isDoneColumn: false },
    { id: "done", title: "Done", order: 2, isDoneColumn: true },
  ];

  it("recognizes escaped column tags in checklist titles", () => {
    const parsed = parseTitleTags("\\[IN PROGRESS\\] task2", columns);
    expect(parsed.displayTitle).toBe("task2");
    expect(parsed.columnTag).toBe("IN PROGRESS");
  });
});
