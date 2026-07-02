import type { KanbanColumnPlaintext } from "@/lib/notes/kanban-types";

export function sortKanbanColumns(columns: KanbanColumnPlaintext[]): KanbanColumnPlaintext[] {
  return [...columns].sort((a, b) => a.order - b.order);
}

export function firstKanbanColumn(columns: KanbanColumnPlaintext[]): KanbanColumnPlaintext {
  const ordered = sortKanbanColumns(columns);
  if (ordered.length === 0) throw new Error("Board has no columns");
  return ordered[0];
}

export function lastKanbanColumn(columns: KanbanColumnPlaintext[]): KanbanColumnPlaintext {
  const ordered = sortKanbanColumns(columns);
  if (ordered.length === 0) throw new Error("Board has no columns");
  return ordered[ordered.length - 1];
}

/** Match a `[UPPERCASE TAG]` to a column title (case-insensitive). */
export function findColumnByTag(
  columns: KanbanColumnPlaintext[],
  tag: string
): KanbanColumnPlaintext | undefined {
  const normalized = tag.trim().toLowerCase();
  return columns.find((column) => column.title.trim().toLowerCase() === normalized);
}

export function columnTagForTitle(column: KanbanColumnPlaintext): string {
  return `[${column.title.trim().toUpperCase()}]`;
}

export function isFirstColumn(columns: KanbanColumnPlaintext[], columnId: string): boolean {
  return firstKanbanColumn(columns).id === columnId;
}

export function isLastColumn(columns: KanbanColumnPlaintext[], columnId: string): boolean {
  return lastKanbanColumn(columns).id === columnId;
}

/** The last column is always the done column. */
export function withDoneColumnOnLast(columns: KanbanColumnPlaintext[]): KanbanColumnPlaintext[] {
  const ordered = sortKanbanColumns(columns);
  const lastIndex = ordered.length - 1;
  return ordered.map((column, index) => ({
    ...column,
    order: index,
    isDoneColumn: index === lastIndex,
  }));
}
