export type QuickInsertId =
  | "heading"
  | "checklist"
  | "quote"
  | "divider"
  | "prayer-section"
  | "gratitude-list"
  | "decision-block"
  | "reflection-section"
  | "action-items";

export type QuickInsertItem = {
  id: QuickInsertId;
  label: string;
};

export const QUICK_INSERT_ITEMS: QuickInsertItem[] = [
  { id: "heading", label: "Heading" },
  { id: "checklist", label: "Checklist" },
  { id: "quote", label: "Quote" },
  { id: "divider", label: "Divider" },
  { id: "prayer-section", label: "Prayer section" },
  { id: "gratitude-list", label: "Gratitude list" },
  { id: "decision-block", label: "Decision block" },
  { id: "reflection-section", label: "Reflection section" },
  { id: "action-items", label: "Action items" },
];

const SNIPPETS: Record<QuickInsertId, string> = {
  heading: "## Heading\n\n",
  checklist: "- [ ] \n- [ ] \n",
  quote: "> \n",
  divider: "---\n\n",
  "prayer-section": "## Prayer\n\n",
  "gratitude-list": "## Gratitude\n\n- \n- \n- \n",
  "decision-block": `## Decision

## Options

- 

## Next step

`,
  "reflection-section": `## Reflection

`,
  "action-items": "## Action items\n\n- [ ] \n",
};

export function getQuickInsertSnippet(id: QuickInsertId): string {
  return SNIPPETS[id];
}

export function insertSnippetIntoMarkdown(
  value: string,
  snippet: string,
  selectionStart: number,
  selectionEnd: number,
  maxLength: number
): { next: string; cursor: number } {
  const needsLeadingNewline =
    selectionStart > 0 && value[selectionStart - 1] !== "\n" && snippet.startsWith("##");
  const prefix = needsLeadingNewline && selectionStart > 0 ? "\n" : "";
  const insertion = prefix + snippet;
  const next = (value.slice(0, selectionStart) + insertion + value.slice(selectionEnd)).slice(
    0,
    maxLength
  );
  return { next, cursor: selectionStart + insertion.length };
}
