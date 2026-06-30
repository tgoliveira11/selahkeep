"use client";

import type {
  KanbanCardPlaintext,
  KanbanColumnPlaintext,
} from "@/lib/notes/kanban-types";

interface KanbanMoveMenuProps {
  card: KanbanCardPlaintext;
  columns: KanbanColumnPlaintext[];
  onMove: (columnId: string, order?: number) => void;
}

export function KanbanMoveMenu({ card, columns, onMove }: KanbanMoveMenuProps) {
  const orderedColumns = [...columns].sort((a, b) => a.order - b.order);
  const currentIndex = orderedColumns.findIndex((column) => column.id === card.columnId);
  const previous = currentIndex > 0 ? orderedColumns[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < orderedColumns.length - 1
      ? orderedColumns[currentIndex + 1]
      : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={`kanban-move-menu-${card.id}`}>
      <label className="sr-only" htmlFor={`move-${card.id}`}>
        Move {card.title}
      </label>
      <select
        id={`move-${card.id}`}
        className="min-h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-medium text-[var(--fg-2)]"
        value={card.columnId}
        onChange={(event) => onMove(event.target.value)}
        aria-label={`Move ${card.title}`}
      >
        {orderedColumns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
      </select>
      <button
        type="button"
        className="min-h-9 rounded-md border border-[var(--border)] px-2 text-xs font-semibold text-[var(--muted)]"
        disabled={!previous}
        onClick={() => previous && onMove(previous.id)}
      >
        Back
      </button>
      <button
        type="button"
        className="min-h-9 rounded-md border border-[var(--border)] px-2 text-xs font-semibold text-[var(--muted)]"
        disabled={!next}
        onClick={() => next && onMove(next.id)}
      >
        Forward
      </button>
    </div>
  );
}
