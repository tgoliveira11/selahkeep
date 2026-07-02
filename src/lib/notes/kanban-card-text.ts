import type { KanbanColumnPlaintext, KanbanPriority } from "@/lib/notes/kanban-types";
import {
  columnTagForTitle,
  findColumnByTag,
  firstKanbanColumn,
  isFirstColumn,
  isLastColumn,
  lastKanbanColumn,
  sortKanbanColumns,
} from "@/lib/notes/kanban-columns";
import { unescapeMarkdownBracketTags } from "@/lib/notes/markdown-brackets";

const BRACKET_TAG_RE = /\[([A-Z][A-Z0-9 ]*)\]/g;
const DUE_DATE_RE = /\[(\d{4}-\d{2}-\d{2})\]/g;
const PRIORITY_TAG_RE = /\[(LOW|MEDIUM|HIGH|URGENT)\]/gi;

const PRIORITY_MAP: Record<string, KanbanPriority> = {
  low: "low",
  medium: "medium",
  high: "high",
  urgent: "urgent",
};

export interface ParsedTitleTags {
  displayTitle: string;
  columnTag?: string;
}

export function parseTitleTags(
  rawTitle: string,
  columns: KanbanColumnPlaintext[]
): ParsedTitleTags {
  let displayTitle = unescapeMarkdownBracketTags(rawTitle.trim());
  let columnTag: string | undefined;

  for (const match of displayTitle.matchAll(BRACKET_TAG_RE)) {
    const tag = match[1].trim();
    if (findColumnByTag(columns, tag)) {
      columnTag = tag;
      displayTitle = displayTitle.replace(match[0], "").replace(/\s+/g, " ").trim();
    }
  }

  return { displayTitle, columnTag };
}

function lastRegexMatch<T extends RegExp>(text: string, re: T): RegExpExecArray | null {
  let last: RegExpExecArray | null = null;
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const global = new RegExp(re.source, flags);
  for (const match of text.matchAll(global)) {
    last = match;
  }
  return last;
}

export function parseDescriptionMetadata(description: string): {
  body: string;
  dueDate: string | null;
  priority: KanbanPriority | null;
} {
  let body = unescapeMarkdownBracketTags(description);
  let dueDate: string | null = null;
  let priority: KanbanPriority | null = null;

  const dueMatch = lastRegexMatch(body, DUE_DATE_RE);
  if (dueMatch) {
    dueDate = dueMatch[1];
    body = body.replace(dueMatch[0], "");
  }

  const priorityMatch = lastRegexMatch(body, PRIORITY_TAG_RE);
  if (priorityMatch) {
    priority = PRIORITY_MAP[priorityMatch[1].toLowerCase()] ?? null;
    body = body.replace(priorityMatch[0], "");
  }

  return { body: body.replace(/\n{3,}/g, "\n\n").trim(), dueDate, priority };
}

export function formatDescriptionWithMetadata(
  description: string | undefined | null,
  dueDate: string | null | undefined,
  priority: KanbanPriority | null | undefined
): string | undefined {
  let body = description?.trim() ?? "";
  body = parseDescriptionMetadata(body).body;

  if (priority) {
    body = body ? `${body}\n[${priority.toUpperCase()}]` : `[${priority.toUpperCase()}]`;
  }
  if (dueDate) {
    body = body ? `${body}\n[${dueDate}]` : `[${dueDate}]`;
  }

  const trimmed = body.trim();
  return trimmed || undefined;
}

export function resolveColumnIdForItem(
  columns: KanbanColumnPlaintext[],
  checked: boolean,
  columnTag?: string
): string {
  const first = firstKanbanColumn(columns);
  const last = lastKanbanColumn(columns);

  if (checked) return last.id;

  if (columnTag) {
    const match = findColumnByTag(columns, columnTag);
    return match?.id ?? first.id;
  }

  return first.id;
}

export function resolveColumnIdForCard(
  columns: KanbanColumnPlaintext[],
  cardColumnId: string
): { checked: boolean; columnTag?: string } {
  const column = columns.find((item) => item.id === cardColumnId);
  if (!column) return { checked: false };

  if (isLastColumn(columns, cardColumnId)) {
    return { checked: true };
  }
  if (isFirstColumn(columns, cardColumnId)) {
    return { checked: false };
  }
  return { checked: false, columnTag: column.title.trim().toUpperCase() };
}

export function formatItemTitleForNote(
  displayTitle: string,
  columns: KanbanColumnPlaintext[],
  columnId: string,
  checked: boolean
): string {
  const ordered = sortKanbanColumns(columns);
  const column = ordered.find((item) => item.id === columnId);
  if (!column) return displayTitle;

  if (checked || isLastColumn(columns, columnId)) {
    return displayTitle;
  }
  if (isFirstColumn(columns, columnId)) {
    return displayTitle;
  }
  return `${columnTagForTitle(column)} ${displayTitle}`.trim();
}
