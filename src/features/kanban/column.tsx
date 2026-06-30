"use client";

import type {
  KanbanCardPlaintext,
  KanbanColumnPlaintext,
  KanbanLabelPlaintext,
} from "@/lib/notes/kanban-types";
import { canDeleteKanbanColumn } from "@/lib/notes/kanban-progress";
import { KanbanCard } from "@/features/kanban/card";
import { cn } from "@/lib/ui/cn";

interface KanbanColumnProps {
  column: KanbanColumnPlaintext;
  columns: KanbanColumnPlaintext[];
  cards: KanbanCardPlaintext[];
  labels: KanbanLabelPlaintext[];
  draggingCardId: string | null;
  onOpenCard: (card: KanbanCardPlaintext) => void;
  onAddCard: (columnId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onToggleDone: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: -1 | 1) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
  onDragStart: (cardId: string) => void;
}

export function KanbanColumn({
  column,
  columns,
  cards,
  labels,
  draggingCardId,
  onOpenCard,
  onAddCard,
  onRenameColumn,
  onToggleDone,
  onDeleteColumn,
  onMoveColumn,
  onMoveCard,
  onDragStart,
}: KanbanColumnProps) {
  const orderedColumns = [...columns].sort((a, b) => a.order - b.order);
  const columnIndex = orderedColumns.findIndex((item) => item.id === column.id);
  const canDelete = canDeleteKanbanColumn(columns, column.id);

  return (
    <section
      className="flex min-h-[22rem] w-[min(88vw,20rem)] shrink-0 snap-start flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-2)] p-3 md:w-80"
      data-testid={`kanban-column-${column.id}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => draggingCardId && onMoveCard(draggingCardId, column.id)}
    >
      <header className="mb-3 space-y-2">
        <div className="flex items-start gap-2">
          <input
            aria-label={`Column title ${column.title}`}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-sm font-semibold tracking-[-0.01em] focus:border-[var(--border)]"
            value={column.title}
            onChange={(event) => onRenameColumn(column.id, event.target.value)}
          />
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              column.isDoneColumn
                ? "border-[var(--success-bd)] text-[var(--success)]"
                : "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            {column.isDoneColumn ? "Done" : `${cards.length}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--primary)]"
            onClick={() => onAddCard(column.id)}
          >
            Add card
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]"
            onClick={() => onToggleDone(column.id)}
            disabled={column.isDoneColumn && !canDelete}
            title={column.isDoneColumn && !canDelete ? "Keep at least one done column" : undefined}
          >
            {column.isDoneColumn ? "Unmark done" : "Mark done"}
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]"
            onClick={() => onMoveColumn(column.id, -1)}
            disabled={columnIndex <= 0}
          >
            Left
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]"
            onClick={() => onMoveColumn(column.id, 1)}
            disabled={columnIndex === orderedColumns.length - 1}
          >
            Right
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--danger)]"
            onClick={() => onDeleteColumn(column.id)}
            disabled={!canDelete || cards.length > 0}
            title={
              cards.length > 0
                ? "Move cards before deleting this column"
                : !canDelete
                  ? "Keep at least one done column"
                  : undefined
            }
          >
            Delete
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            columns={orderedColumns}
            labels={labels}
            onOpen={onOpenCard}
            onMove={onMoveCard}
            onDragStart={onDragStart}
          />
        ))}
        {cards.length === 0 && (
          <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
            Drop cards here or add one.
          </p>
        )}
      </div>
    </section>
  );
}
