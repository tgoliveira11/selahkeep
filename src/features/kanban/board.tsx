"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ResolvedReflectionDialog, type ResolvedReflectionFields } from "@/components/notes/resolved-reflection-dialog";
import { KanbanColumn } from "@/features/kanban/column";
import { KanbanCardDialog } from "@/features/kanban/dialog";
import { KanbanLabelManager } from "@/features/kanban/labels";
import { KanbanVersionHistory } from "@/features/kanban/version-history";
import {
  getKanbanProgress,
  moveKanbanCard,
  reorderKanbanCards,
} from "@/lib/notes/kanban-progress";
import type {
  KanbanBoardPlaintext,
  KanbanCardPlaintext,
  KanbanColumnPlaintext,
} from "@/lib/notes/kanban-types";

interface KanbanBoardProps {
  board: KanbanBoardPlaintext;
  saving?: boolean;
  noteResolved?: boolean;
  onChange: (board: KanbanBoardPlaintext, options?: { appendVersion?: boolean }) => void | Promise<void>;
  onRestore?: (board: KanbanBoardPlaintext) => void | Promise<void>;
  onResolveNote?: (fields: ResolvedReflectionFields | null) => void | Promise<void>;
  onReopenNote?: () => void | Promise<void>;
  onBackHref?: string;
}

function normalizeColumns(columns: KanbanColumnPlaintext[]) {
  return [...columns]
    .sort((a, b) => a.order - b.order)
    .map((column, order) => ({ ...column, order }));
}

export function KanbanBoard({
  board,
  saving = false,
  noteResolved = false,
  onChange,
  onRestore,
  onResolveNote,
  onReopenNote,
  onBackHref,
}: KanbanBoardProps) {
  const [draft, setDraft] = useState(board);
  const [editingCard, setEditingCard] = useState<KanbanCardPlaintext | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reopenSuggested, setReopenSuggested] = useState(false);
  const [suggestionDismissedFor, setSuggestionDismissedFor] = useState<string | null>(null);
  const previousComplete = useRef(getKanbanProgress(board).complete);

  useEffect(() => {
    setDraft(board);
    previousComplete.current = getKanbanProgress(board).complete;
  }, [board]);

  const progress = useMemo(() => getKanbanProgress(draft), [draft]);
  const orderedColumns = useMemo(() => normalizeColumns(draft.columns), [draft.columns]);

  async function commit(next: KanbanBoardPlaintext, options?: { appendVersion?: boolean }) {
    setDraft(next);
    const wasComplete = previousComplete.current;
    const nextProgress = getKanbanProgress(next);
    previousComplete.current = nextProgress.complete;
    await onChange(next, options);

    if (
      next.scope === "note" &&
      nextProgress.complete &&
      !wasComplete &&
      !noteResolved &&
      onResolveNote &&
      suggestionDismissedFor !== next.boardId
    ) {
      setResolveOpen(true);
    }
    if (next.scope === "note" && wasComplete && !nextProgress.complete && noteResolved && onReopenNote) {
      setReopenSuggested(true);
    }
  }

  function addColumn() {
    const now = new Date().toISOString();
    void commit(
      {
        ...draft,
        columns: [
          ...orderedColumns,
          {
            id: crypto.randomUUID(),
            title: "New column",
            order: orderedColumns.length,
            isDoneColumn: false,
          },
        ],
        updatedAt: now,
      },
      { appendVersion: true }
    );
  }

  function updateColumn(columnId: string, patch: Partial<KanbanColumnPlaintext>) {
    void commit({
      ...draft,
      columns: draft.columns.map((column) =>
        column.id === columnId ? { ...column, ...patch } : column
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  function moveColumn(columnId: string, direction: -1 | 1) {
    const columns = normalizeColumns(draft.columns);
    const index = columns.findIndex((column) => column.id === columnId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= columns.length) return;
    const reordered = [...columns];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    void commit(
      { ...draft, columns: reordered.map((column, order) => ({ ...column, order })) },
      { appendVersion: true }
    );
  }

  function deleteColumn(columnId: string) {
    void commit(
      {
        ...draft,
        columns: normalizeColumns(draft.columns.filter((column) => column.id !== columnId)),
        updatedAt: new Date().toISOString(),
      },
      { appendVersion: true }
    );
  }

  function addCard(columnId: string) {
    const now = new Date().toISOString();
    const order = draft.cards.filter((card) => card.columnId === columnId).length;
    setEditingCard({
      id: crypto.randomUUID(),
      columnId,
      title: "",
      description: "",
      order,
      dueDate: null,
      priority: null,
      labelIds: [],
      createdAt: now,
      updatedAt: now,
      source: { kind: "manual" },
    });
  }

  function saveCard(card: KanbanCardPlaintext) {
    const exists = draft.cards.some((item) => item.id === card.id);
    const nextCards = exists
      ? draft.cards.map((item) => (item.id === card.id ? card : item))
      : [...draft.cards, card];
    setEditingCard(null);
    void commit(
      { ...draft, cards: reorderKanbanCards(nextCards), updatedAt: new Date().toISOString() },
      { appendVersion: true }
    );
  }

  function deleteCard(cardId: string) {
    setEditingCard(null);
    void commit(
      {
        ...draft,
        cards: reorderKanbanCards(draft.cards.filter((card) => card.id !== cardId)),
        updatedAt: new Date().toISOString(),
      },
      { appendVersion: true }
    );
  }

  function moveCard(cardId: string, columnId: string) {
    void commit(moveKanbanCard(draft, cardId, columnId), { appendVersion: true });
  }

  return (
    <div className="space-y-5" data-testid="kanban-board">
      <header className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {onBackHref && (
            <Link href={onBackHref} className="text-sm font-medium text-[var(--primary)]">
              Back
            </Link>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              aria-label="Board title"
              className="max-w-full rounded-md border border-transparent bg-transparent px-1 text-2xl font-semibold tracking-[-0.03em] focus:border-[var(--border)]"
              value={draft.title}
              readOnly={draft.scope === "note"}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              onBlur={() => void commit({ ...draft, updatedAt: new Date().toISOString() }, { appendVersion: true })}
            />
            <span className="rounded-full border border-[var(--border-2)] px-2 py-1 text-xs font-semibold text-[var(--primary)]">
              {progress.done}/{progress.total} done
            </span>
            {saving && <span className="text-xs text-[var(--muted)]">Saving...</span>}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {draft.scope === "note"
              ? "Linked to the source note — checklist and card changes sync both ways."
              : "Standalone private board."}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={addColumn}>
          Add column
        </Button>
      </header>

      {progress.complete && (
        <Alert variant="success" role="status" data-testid="kanban-complete-alert">
          {draft.scope === "note"
            ? "All cards are in done columns."
            : "This board is 100% done."}
        </Alert>
      )}

      {reopenSuggested && (
        <Alert variant="info" role="status" data-testid="kanban-reopen-suggestion">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>A card moved out of done. Reopen the note?</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setReopenSuggested(false)}>
                Dismiss
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setReopenSuggested(false);
                  void onReopenNote?.();
                }}
              >
                Reopen note
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <div className="flex snap-x gap-3 overflow-x-auto pb-3" aria-label="Kanban columns">
        {orderedColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            columns={orderedColumns}
            cards={draft.cards
              .filter((card) => card.columnId === column.id)
              .sort((a, b) => a.order - b.order)}
            labels={draft.labels}
            draggingCardId={draggingCardId}
            onOpenCard={setEditingCard}
            onAddCard={addCard}
            onRenameColumn={(columnId, title) => updateColumn(columnId, { title })}
            onToggleDone={(columnId) => {
              const columnToToggle = draft.columns.find((item) => item.id === columnId);
              if (columnToToggle) {
                updateColumn(columnId, { isDoneColumn: !columnToToggle.isDoneColumn });
              }
            }}
            onDeleteColumn={deleteColumn}
            onMoveColumn={moveColumn}
            onMoveCard={moveCard}
            onDragStart={setDraggingCardId}
          />
        ))}
      </div>

      <KanbanLabelManager
        labels={draft.labels}
        onChange={(labels) =>
          void commit({ ...draft, labels, updatedAt: new Date().toISOString() }, { appendVersion: true })
        }
      />

      <KanbanVersionHistory
        boardId={draft.boardId}
        enabled={Boolean(onRestore)}
        currentBoard={draft}
        onRestore={(restored) => onRestore?.(restored)}
      />

      <KanbanCardDialog
        key={editingCard?.id ?? "closed"}
        card={editingCard}
        labels={draft.labels}
        open={Boolean(editingCard)}
        onSave={saveCard}
        onDelete={deleteCard}
        onCancel={() => setEditingCard(null)}
      />

      <ResolvedReflectionDialog
        open={resolveOpen}
        loading={saving}
        onSaveAndResolve={(fields) => {
          setResolveOpen(false);
          void onResolveNote?.(fields);
        }}
        onResolveWithoutReflection={() => {
          setResolveOpen(false);
          void onResolveNote?.(null);
        }}
        onCancel={() => {
          setSuggestionDismissedFor(draft.boardId);
          setResolveOpen(false);
        }}
      />
    </div>
  );
}
