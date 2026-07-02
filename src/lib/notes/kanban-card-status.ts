import { formatNoteUpdatedShort } from "@/lib/notes/note-dates";
import type { KanbanCardPlaintext } from "@/lib/notes/kanban-types";

export function lastKanbanCardStatusChange(card: KanbanCardPlaintext): string {
  const last = card.statusHistory?.[card.statusHistory.length - 1];
  return last?.at ?? card.updatedAt;
}

export function kanbanCardStatusHistoryTitle(card: KanbanCardPlaintext): string {
  const events = card.statusHistory ?? [];
  if (events.length === 0) return "No column history yet";
  return events
    .map((event) => {
      const when = formatNoteUpdatedShort(event.at);
      const priority = event.priority ? ` · ${event.priority}` : "";
      return `${when}: ${event.columnTitle}${priority}`;
    })
    .join("\n");
}
