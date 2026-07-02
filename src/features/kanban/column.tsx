"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type {
  KanbanCardPlaintext,
  KanbanColumnPlaintext,
  KanbanLabelPlaintext,
} from "@/lib/notes/kanban-types";
import { canDeleteKanbanColumn } from "@/lib/notes/kanban-progress";
import { isLastColumn } from "@/lib/notes/kanban-columns";
import { cardMatchesSearch } from "@/lib/notes/kanban-card-tags";
import { KanbanCard } from "@/features/kanban/card";
import { KANBAN_INSERT_HOVER_MS } from "@/features/kanban/kanban-insert-hover-ms";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconTrash,
} from "@/components/ui/toolbar-icons";
import { cn } from "@/lib/ui/cn";

interface KanbanColumnProps {
  column: KanbanColumnPlaintext;
  columns: KanbanColumnPlaintext[];
  cards: KanbanCardPlaintext[];
  labels: KanbanLabelPlaintext[];
  draggingCardId: string | null;
  searchQuery?: string;
  onOpenCard: (card: KanbanCardPlaintext) => void;
  onAddCard: (columnId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: -1 | 1) => void;
  onMoveCard: (cardId: string, columnId: string, insertIndex?: number) => void;
  onDragStart: (cardId: string) => void;
  onDragEnd: () => void;
}

function KanbanInsertGap({
  index,
  armed,
  onArm,
  onDisarm,
  onDropAt,
}: {
  index: number;
  armed: boolean;
  onArm: (index: number) => void;
  onDisarm: (index: number) => void;
  onDropAt: (index: number, armed: boolean) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  function handleDragEnter() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onArm(index), KANBAN_INSERT_HOVER_MS);
  }

  function handleDragLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    onDisarm(index);
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] transition-all",
        armed
          ? "my-1 h-2 border border-dashed border-[var(--primary)] bg-[var(--lilac)]"
          : "h-1"
      )}
      data-testid={`kanban-insert-gap-${index}`}
      data-armed={armed ? "true" : "false"}
      onDragEnter={(event) => {
        event.preventDefault();
        handleDragEnter();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (timerRef.current) clearTimeout(timerRef.current);
        onDropAt(index, armed);
      }}
    />
  );
}

export function KanbanColumn({
  column,
  columns,
  cards,
  labels,
  draggingCardId,
  searchQuery = "",
  onOpenCard,
  onAddCard,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
  onMoveCard,
  onDragStart,
  onDragEnd,
}: KanbanColumnProps) {
  const orderedColumns = [...columns].sort((a, b) => a.order - b.order);
  const columnIndex = orderedColumns.findIndex((item) => item.id === column.id);
  const canDelete = canDeleteKanbanColumn(columns, column.id);
  const isDoneColumn = isLastColumn(columns, column.id);
  const sortedCards = [...cards].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  const [armedInsertIndex, setArmedInsertIndex] = useState<number | null>(null);

  function disarmGap(index: number) {
    if (armedInsertIndex === index) setArmedInsertIndex(null);
  }

  function handleColumnDrop() {
    if (!draggingCardId) return;
    if (armedInsertIndex !== null) {
      onMoveCard(draggingCardId, column.id, armedInsertIndex);
    } else {
      onMoveCard(draggingCardId, column.id);
    }
    resetInsertState();
    onDragEnd();
  }

  function resetInsertState() {
    setArmedInsertIndex(null);
  }

  function handleGapDrop(index: number, armed: boolean) {
    if (!draggingCardId) return;
    if (armed) {
      onMoveCard(draggingCardId, column.id, index);
    } else {
      onMoveCard(draggingCardId, column.id);
    }
    resetInsertState();
    onDragEnd();
  }

  return (
    <section
      className="flex min-h-[22rem] w-[min(88vw,26.67rem)] shrink-0 snap-start flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-2)] p-3 md:w-[26.67rem]"
      data-testid={`kanban-column-${column.id}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleColumnDrop();
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        resetInsertState();
      }}
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
              isDoneColumn
                ? "border-[var(--success-bd)] text-[var(--success)]"
                : "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            {isDoneColumn ? "Done" : `${sortedCards.length}`}
          </span>
        </div>
        <div
          className="flex flex-nowrap items-center gap-1"
          data-testid={`kanban-column-toolbar-${column.id}`}
        >
          <ToolbarButton
            label="Add card"
            testId={`kanban-column-add-card-${column.id}`}
            icon={<IconPlus />}
            iconOnly
            primary
            title="Add a new card to this column"
            onClick={() => onAddCard(column.id)}
          />
          <ToolbarButton
            label="Move column left"
            testId={`kanban-column-move-left-${column.id}`}
            icon={<IconChevronLeft />}
            iconOnly
            disabled={columnIndex <= 0}
            title="Move this column one position to the left"
            onClick={() => onMoveColumn(column.id, -1)}
          />
          <ToolbarButton
            label="Move column right"
            testId={`kanban-column-move-right-${column.id}`}
            icon={<IconChevronRight />}
            iconOnly
            disabled={columnIndex === orderedColumns.length - 1}
            title="Move this column one position to the right"
            onClick={() => onMoveColumn(column.id, 1)}
          />
          <button
            type="button"
            data-testid={`kanban-column-delete-${column.id}`}
            className="toolbar-button toolbar-button--icon-only text-[var(--danger)]"
            aria-label="Delete column"
            disabled={!canDelete || sortedCards.length > 0}
            title={
              sortedCards.length > 0
                ? "Move cards before deleting this column"
                : !canDelete
                  ? "Keep at least one column on the board"
                  : undefined
            }
            onClick={() => onDeleteColumn(column.id)}
          >
            <span className="toolbar-button__icon">
              <IconTrash />
            </span>
            <span className="sr-only">Delete</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2">
        {sortedCards.length === 0 ? (
          <>
            <KanbanInsertGap
              index={0}
              armed={armedInsertIndex === 0}
              onArm={setArmedInsertIndex}
              onDisarm={disarmGap}
              onDropAt={handleGapDrop}
            />
            <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
              Drop cards here or add one.
            </p>
          </>
        ) : (
          sortedCards.map((card, index) => {
            const dimmed =
              Boolean(searchQuery.trim()) &&
              card.id !== draggingCardId &&
              !cardMatchesSearch(card, searchQuery);
            return (
              <Fragment key={card.id}>
                <KanbanInsertGap
                  index={index}
                  armed={armedInsertIndex === index}
                  onArm={setArmedInsertIndex}
                  onDisarm={disarmGap}
                  onDropAt={handleGapDrop}
                />
                <div className={cn(dimmed && "opacity-35")}>
                  <KanbanCard
                    card={card}
                    columns={orderedColumns}
                    labels={labels}
                    onOpen={onOpenCard}
                    onMove={(cardId, columnId) => onMoveCard(cardId, columnId)}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                </div>
              </Fragment>
            );
          })
        )}
        {sortedCards.length > 0 && (
          <KanbanInsertGap
            index={sortedCards.length}
            armed={armedInsertIndex === sortedCards.length}
            onArm={setArmedInsertIndex}
            onDisarm={resetInsertState}
            onDropAt={handleGapDrop}
          />
        )}
      </div>
    </section>
  );
}
