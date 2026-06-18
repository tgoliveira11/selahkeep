const CHECKLIST_LINE = /^(\s*[-*+]\s+)\[([ xX])\](.*)$/;

/** Counts GitHub-style task list items in markdown source. */
export function countChecklistItems(markdown: string): number {
  let count = 0;
  for (const line of markdown.split("\n")) {
    if (CHECKLIST_LINE.test(line)) count += 1;
  }
  return count;
}

/** Toggles `[ ]` ↔ `[x]` for the checklist item at `itemIndex` (0-based). */
export function toggleChecklistAtIndex(markdown: string, itemIndex: number): string {
  let current = -1;
  return markdown
    .split("\n")
    .map((line) => {
      const match = line.match(CHECKLIST_LINE);
      if (!match) return line;
      current += 1;
      if (current !== itemIndex) return line;
      const checked = match[2].toLowerCase() === "x";
      const mark = checked ? " " : "x";
      return `${match[1]}[${mark}]${match[3]}`;
    })
    .join("\n");
}
