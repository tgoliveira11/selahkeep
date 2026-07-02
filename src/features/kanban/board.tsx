"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "@/features/kanban/column";
import { KanbanCardDialog } from "@/features/kanban/dialog";
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
import { sortKanbanColumns, withDoneColumnOnLast } from "@/lib/notes/kanban-columns";
import { formatDescriptionWithMetadata } from "@/lib/notes/kanban-card-text";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

interface KanbanBoardProps {
  board: KanbanBoardPlaintext;
  saving?: boolean;
  onChange: (board: KanbanBoardPlaintext, options?: { appendVersion?: boolean }) => void | Promise<void>;
  onRestore?: (board: KanbanBoardPlaintext) => void | Promise<void>;
  onResolveNote?: () => void | Promise<void>;
  onReopenNote?: () => void | Promise<void>;
  onBackHref?: string;
  /** Standalone boards only — links the board to a new note so it gets note version history. */
  onCreateNote?: () => void | Promise<void>;
  creatingNote?: boolean;
  userId?: string | null;
  encryptedWrappedKey?: EncryptedPayload | null;
}

function normalizeColumns(columns: KanbanColumnPlaintext[]) {
  return withDoneColumnOnLast(columns);
}

export function KanbanBoard({
  board,
  saving = false,
  onChange,
  onRestore,
  onResolveNote,
  onReopenNote,
  onBackHref,
  onCreateNote,
  creatingNote = false,
  userId = null,
  encryptedWrappedKey = null,
}: KanbanBoardProps) {
  const [draft, setDraft] = useState(board);
  const [editingCard, setEditingCard] = useState<KanbanCardPlaintext | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const previousComplete = useRef(getKanbanProgress(board).complete);
  const loadedBoardIdRef = useRef(board.boardId);

  useEffect(() => {
    if (board.boardId === loadedBoardIdRef.current) return;
    loadedBoardIdRef.current = board.boardId;
    setDraft(board);
    previousComplete.current = getKanbanProgress(board).complete;
  }, [board]);

  const progress = useMemo(() => getKanbanProgress(draft), [draft]);
  const orderedColumns = useMemo(() => normalizeColumns(draft.columns), [draft.columns]);
  const tagSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const card of draft.cards) {
      for (const tag of card.tagNames ?? []) names.add(tag);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [draft.cards]);

  async function commit(next: KanbanBoardPlaintext, options?: { appendVersion?: boolean }) {
    setDraft(next);
    const wasComplete = previousComplete.current;
    const nextProgress = getKanbanProgress(next);
    previousComplete.current = nextProgress.complete;
    void onChange(next, options);

    if (next.scope === "note" && nextProgress.total > 0) {
      if (nextProgress.complete && !wasComplete) {
        void onResolveNote?.();
      } else if (!nextProgress.complete && wasComplete) {
        void onReopenNote?.();
      }
    }
  }

  function addColumn() {
    const now = new Date().toISOString();
    const ordered = sortKanbanColumns(draft.columns);
    const insertAt = Math.max(0, ordered.length - 1);
    const nextColumns = [
      ...ordered.slice(0, insertAt),
      {
        id: crypto.randomUUID(),
        title: "New column",
        order: insertAt,
        isDoneColumn: false,
      },
      ...ordered.slice(insertAt),
    ];
    void commit(
      {
        ...draft,
        columns: normalizeColumns(nextColumns),
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
      tagNames: [],
      createdAt: now,
      updatedAt: now,
      source: { kind: "manual" },
    });
  }

  function saveCard(card: KanbanCardPlaintext) {
    const now = new Date().toISOString();
    const exists = draft.cards.some((item) => item.id === card.id);
    const previous = exists ? draft.cards.find((item) => item.id === card.id) : null;
    const column = draft.columns.find((item) => item.id === card.columnId);
    let nextCard: KanbanCardPlaintext = {
      ...card,
      title: card.title.trim(),
      updatedAt: now,
      description: formatDescriptionWithMetadata(
        card.description,
        card.dueDate,
        card.priority,
        card.tagNames
      ),
    };

    const history = nextCard.statusHistory ?? previous?.statusHistory ?? [];
    const last = history[history.length - 1];
    const priorityChanged =
      previous && (previous.priority ?? null) !== (nextCard.priority ?? null);
    const needsHistory =
      !previous ||
      priorityChanged ||
      (previous && previous.columnId !== nextCard.columnId);
    if (
      needsHistory &&
      column &&
      (!last ||
        last.columnId !== nextCard.columnId ||
        last.priority !== (nextCard.priority ?? null))
    ) {
      nextCard = {
        ...nextCard,
        statusHistory: [
          ...history,
          {
            at: now,
            columnId: nextCard.columnId,
            columnTitle: column.title,
            priority: nextCard.priority ?? null,
          },
        ],
      };
    }

    const nextCards = exists
      ? draft.cards.map((item) => (item.id === card.id ? nextCard : item))
      : [...draft.cards, nextCard];
    setEditingCard(null);
    void commit(
      { ...draft, cards: reorderKanbanCards(nextCards), updatedAt: now },
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

  function moveCard(cardId: string, columnId: string, insertIndex?: number) {
    void commit(moveKanbanCard(draft, cardId, columnId, insertIndex), { appendVersion: true });
  }

  return (
    <div className="space-y-5" data-testid="kanban-board">
      <header className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {draft.scope === "standalone" && onCreateNote && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void onCreateNote()}
                disabled={creatingNote}
                title="Link this board to a new note, so it gets note version history"
              >
                {creatingNote ? "Creating note…" : "Create note from board"}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={addColumn} title="Add a new workflow column to this board">
              Add column
            </Button>
          </div>
        </div>

        <label className="block">
          <span className="sr-only">Search cards</span>
          <input
            type="search"
            value={cardSearch}
            onChange={(event) => setCardSearch(event.target.value)}
            placeholder="Search cards by title, description, or tags"
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            data-testid="kanban-card-search"
          />
        </label>

        <p className="text-sm text-[var(--muted)]">
          {draft.scope === "note"
            ? "Linked to the source note — checklist and card changes sync both ways."
            : "Standalone private board."}
        </p>
      </header>

      {progress.complete && (
        <Alert variant="success" role="status" data-testid="kanban-complete-alert">
          {draft.scope === "note"
            ? "All cards are in done columns."
            : "This board is 100% done."}
        </Alert>
      )}

      <div className="flex snap-x gap-3 overflow-x-auto pb-3" aria-label="Kanban columns">
        {orderedColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            columns={orderedColumns}
            cards={draft.cards
              .filter((card) => card.columnId === column.id)}
            labels={draft.labels}
            draggingCardId={draggingCardId}
            searchQuery={cardSearch}
            onOpenCard={setEditingCard}
            onAddCard={addCard}
            onRenameColumn={(columnId, title) => updateColumn(columnId, { title })}
            onDeleteColumn={deleteColumn}
            onMoveColumn={moveColumn}
            onMoveCard={moveCard}
            onDragStart={setDraggingCardId}
            onDragEnd={() => setDraggingCardId(null)}
          />
        ))}
      </div>

      <KanbanCardDialog
        key={editingCard?.id ?? "closed"}
        card={editingCard}
        labels={draft.labels}
        tagSuggestions={tagSuggestions}
        open={Boolean(editingCard)}
        onSave={saveCard}
        onDelete={deleteCard}
        onCancel={() => setEditingCard(null)}
        boardId={draft.boardId}
        userId={userId}
        wrappedKey={encryptedWrappedKey}
      />

    </div>
  );
}
