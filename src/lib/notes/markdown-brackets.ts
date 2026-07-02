/**
 * TipTap / prosemirror-markdown escapes literal `[tags]` as `\[tags\]`.
 * Kanban column, priority, and due-date markers must stay unescaped in note bodies.
 */
export function unescapeMarkdownBracketTags(text: string): string {
  return text.replace(/\\\[([^\]]*)\\\]/g, "[$1]");
}
