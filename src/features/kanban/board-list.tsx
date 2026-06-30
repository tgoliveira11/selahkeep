"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { KanbanBoardIndexEntry, KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import { getKanbanProgress } from "@/lib/notes/kanban-progress";

interface KanbanBoardListProps {
  boards: KanbanBoardPlaintext[];
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

export function KanbanBoardList({
  boards,
  cachedBoards = [],
  loading = false,
  onCreate,
}: KanbanBoardListProps) {
  const [title, setTitle] = useState("");
  const entries = boards.length > 0 ? boards.map(toEntry) : cachedBoards;

  return (
    <div className="space-y-5" data-testid="kanban-board-list">
      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-base font-semibold">New board</h2>
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

      {entries.length === 0 ? (
        <EmptyState
          title="No standalone boards yet"
          description="Create a private board for work that does not belong to a note."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((board) => (
            <Link
              key={board.id}
              href={`/kanban/${board.id}`}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
              data-testid={`kanban-board-list-item-${board.id}`}
            >
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
          ))}
        </div>
      )}
    </div>
  );
}
