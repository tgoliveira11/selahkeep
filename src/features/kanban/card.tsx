"use client";

import type {
  KanbanCardPlaintext,
  KanbanColumnPlaintext,
  KanbanLabelPlaintext,
} from "@/lib/notes/kanban-types";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { KanbanLabelChip, KanbanPriorityChip } from "@/features/kanban/labels";
import { KanbanMoveMenu } from "@/features/kanban/move-menu";

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T00:00:00`).getTime() < today.getTime();
}

interface KanbanCardProps {
  card: KanbanCardPlaintext;
  columns: KanbanColumnPlaintext[];
  labels: KanbanLabelPlaintext[];
  onOpen: (card: KanbanCardPlaintext) => void;
  onMove: (cardId: string, columnId: string) => void;
  onDragStart: (cardId: string) => void;
}

export function KanbanCard({
  card,
  columns,
  labels,
  onOpen,
  onMove,
  onDragStart,
}: KanbanCardProps) {
  const cardLabels = labels.filter((label) => card.labelIds?.includes(label.id));
  return (
    <article
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-sm)]"
      data-testid={`kanban-card-${card.id}`}
      draggable
      onDragStart={() => onDragStart(card.id)}
    >
      <button
        type="button"
        className="block w-full rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        onClick={() => onOpen(card)}
      >
        <h3 className="text-sm font-semibold tracking-[-0.01em]">{card.title}</h3>
        {card.description && (
          <MarkdownPreview
            markdown={card.description}
            className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--fg-2)]"
          />
        )}
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {card.dueDate && (
          <span
            className={
              isOverdue(card.dueDate)
                ? "inline-flex rounded-full border border-[var(--danger-bd)] px-2 py-0.5 text-[11px] font-semibold text-[var(--danger)]"
                : "inline-flex rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]"
            }
          >
            {card.dueDate}
          </span>
        )}
        <KanbanPriorityChip priority={card.priority} />
        {cardLabels.map((label) => (
          <KanbanLabelChip key={label.id} label={label} />
        ))}
      </div>

      <div className="mt-3 md:hidden">
        <KanbanMoveMenu
          card={card}
          columns={columns}
          onMove={(columnId) => onMove(card.id, columnId)}
        />
      </div>
    </article>
  );
}
