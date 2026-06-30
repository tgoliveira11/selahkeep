"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { KanbanBoardIndexEntry, KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import { getKanbanProgress } from "@/lib/notes/kanban-progress";

interface KanbanBoardListProps {
  boards: KanbanBoardPlaintext[];
  noteBoards?: KanbanBoardPlaintext[];
  cachedBoards?: KanbanBoardIndexEntry[];
  loading?: boolean;
  onCreate: (title: string) => void | Promise<void>;
}

function toEntry(board: KanbanBoardPlaintext): KanbanBoardIndexEntry {
  const progress = getKanbanProgress(board);
  return {
    id: board.boardId,
    title: board.title,
    total: progress.total,
    done: progress.done,
    updatedAt: board.updatedAt,
  };
}

function BoardCard({ board, noteId }: { board: KanbanBoardIndexEntry; noteId?: string | null }) {
  return (
    <article
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
      data-testid={`kanban-board-list-item-${board.id}`}
    >
      <Link href={`/kanban/${board.id}`} className="block">
        <p className="text-base font-semibold tracking-[-0.01em]">{board.title}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {board.done}/{board.total} cards done
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--card-2)]">
          <div
            className="h-full rounded-full bg-[var(--primary-solid)]"
            style={{ width: `${board.total === 0 ? 0 : Math.round((board.done / board.total) * 100)}%` }}
          />
        </div>
      </Link>
      {noteId ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          From note ·{" "}
          <Link href={`/notes/${noteId}`} className="text-[var(--primary)]">
            Open note
          </Link>
        </p>
      ) : null}
    </article>
  );
}

export function KanbanBoardList({
  boards,
  noteBoards = [],
  cachedBoards = [],
  loading = false,
  onCreate,
}: KanbanBoardListProps) {
  const [title, setTitle] = useState("");
  const standaloneEntries =
    boards.length > 0 ? boards.map(toEntry) : cachedBoards;
  const noteEntries = noteBoards.map(toEntry);
  const noteBoardById = new Map(noteBoards.map((board) => [board.boardId, board]));
  const hasStandalone = standaloneEntries.length > 0;
  const hasNoteBoards = noteEntries.length > 0;

  return (
    <div className="space-y-5" data-testid="kanban-board-list">
      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-base font-semibold">New board</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Standalone boards live here. Boards generated from a note stay linked to that note.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const nextTitle = title.trim() || "Untitled board";
            setTitle("");
            void onCreate(nextTitle);
          }}
        >
          <input
            aria-label="Board title"
            className="min-h-11 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-transparent px-3"
            value={title}
            placeholder="Board title"
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button type="submit" disabled={loading}>
            Create board
          </Button>
        </form>
      </section>

      {hasStandalone ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Standalone boards</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {standaloneEntries.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </section>
      ) : null}

      {hasNoteBoards ? (
        <section className="space-y-3" data-testid="kanban-note-board-list">
          <div>
            <h2 className="text-base font-semibold">Boards from notes</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              These boards were generated from note checklists and tasks. Open the board or return to the note.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {noteEntries.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                noteId={noteBoardById.get(board.id)?.noteId}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!hasStandalone && !hasNoteBoards ? (
        <EmptyState
          title="No boards yet"
          description="Create a standalone board above, or open a note with checklist items and choose Generate kanban."
        />
      ) : !hasStandalone && hasNoteBoards ? (
        <EmptyState
          title="No standalone boards yet"
          description="Your note boards are listed above. Create a standalone board when you want tasks that are not tied to a note."
        />
      ) : null}
    </div>
  );
}
