import { describe, it, expect } from "vitest";
import { diffLines, diffStats, isUnchanged } from "@/lib/notes/text-diff";

describe("text-diff", () => {
  it("reports identical text as unchanged", () => {
    const lines = diffLines("a\nb\nc", "a\nb\nc");
    expect(isUnchanged(lines)).toBe(true);
    expect(diffStats(lines)).toEqual({ added: 0, removed: 0, unchanged: 3 });
  });

  it("detects an added line", () => {
    const lines = diffLines("a\nb", "a\nb\nc");
    const added = lines.filter((l) => l.type === "added");
    expect(added).toHaveLength(1);
    expect(added[0].value).toBe("c");
    expect(added[0].rightLine).toBe(3);
    expect(added[0].leftLine).toBeNull();
  });

  it("detects a removed line", () => {
    const lines = diffLines("a\nb\nc", "a\nc");
    const removed = lines.filter((l) => l.type === "removed");
    expect(removed).toHaveLength(1);
    expect(removed[0].value).toBe("b");
    expect(removed[0].leftLine).toBe(2);
    expect(removed[0].rightLine).toBeNull();
  });

  it("handles a replaced line as remove + add", () => {
    const lines = diffLines("hello world", "hello there");
    expect(diffStats(lines)).toEqual({ added: 1, removed: 1, unchanged: 0 });
    expect(isUnchanged(lines)).toBe(false);
  });

  it("handles empty before (all added) and empty after (all removed)", () => {
    expect(diffStats(diffLines("", "x\ny"))).toEqual({ added: 2, removed: 0, unchanged: 0 });
    expect(diffStats(diffLines("x\ny", ""))).toEqual({ added: 0, removed: 2, unchanged: 0 });
  });

  it("preserves multi-hunk ordering", () => {
    const lines = diffLines("a\nb\nc\nd", "a\nB\nc\nD\ne");
    expect(lines.map((l) => `${l.type[0]}:${l.value}`)).toEqual([
      "u:a",
      "r:b",
      "a:B",
      "u:c",
      "r:d",
      "a:D",
      "a:e",
    ]);
  });

  it("treats two empty strings as unchanged with no lines", () => {
    const lines = diffLines("", "");
    expect(lines).toEqual([]);
    expect(isUnchanged(lines)).toBe(true);
  });
});
