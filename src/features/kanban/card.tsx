"use client";

import { useRef } from "react";
import type {
  KanbanCardPlaintext,
  KanbanColumnPlaintext,
  KanbanLabelPlaintext,
} from "@/lib/notes/kanban-types";
import { KanbanCardPreviewPopover } from "@/features/kanban/card-preview-popover";
import { KanbanPriorityChip } from "@/features/kanban/labels";
import { NoteTagChip } from "@/components/notes/note-labels";
import { extractCardTagsFromDescription } from "@/lib/notes/kanban-card-tags";
import { KanbanMoveMenu } from "@/features/kanban/move-menu";
import {
  kanbanCardStatusHistoryTitle,
  lastKanbanCardStatusChange,
} from "@/lib/notes/kanban-card-status";
import { formatNoteUpdatedShort } from "@/lib/notes/note-dates";

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
  onOpen,
  onMove,
  onDragStart,
}: KanbanCardProps) {
  const draggedRef = useRef(false);
  const tagNames = card.tagNames ?? extractCardTagsFromDescription(card.description);

  function handleOpen() {
    if (draggedRef.current) return;
    onOpen(card);
  }

  return (
    <KanbanCardPreviewPopover card={card} onOpen={handleOpen}>
      <article
        role="button"
        tabIndex={0}
        className="w-full cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 text-left shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        data-testid={`kanban-card-${card.id}`}
        draggable
        onDragStart={() => {
          draggedRef.current = true;
          onDragStart(card.id);
        }}
        onDragEnd={() => {
          window.setTimeout(() => {
            draggedRef.current = false;
          }, 0);
        }}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpen();
          }
        }}
      >
        <h3 className="text-sm font-semibold tracking-[-0.01em]">{card.title}</h3>

        {tagNames.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagNames.map((name) => (
              <NoteTagChip key={name} name={name} />
            ))}
          </div>
        )}

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
          <span
            className="ml-auto text-[10px] font-normal text-[var(--muted)]"
            title={kanbanCardStatusHistoryTitle(card)}
          >
            {formatNoteUpdatedShort(lastKanbanCardStatusChange(card))}
          </span>
        </div>

        <div
          className="mt-3 md:hidden"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <KanbanMoveMenu
            card={card}
            columns={columns}
            onMove={(columnId) => onMove(card.id, columnId)}
          />
        </div>
      </article>
    </KanbanCardPreviewPopover>
  );
}
