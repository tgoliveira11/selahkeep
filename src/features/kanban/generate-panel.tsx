"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  createKanbanBoardFromNote,
  recognizeKanbanActivities,
} from "@/lib/notes/kanban-from-note";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";

interface GenerateFromNotePanelProps {
  noteId: string;
  noteTitle: string;
  body: string;
  existingBoard?: KanbanBoardPlaintext | null;
  loading?: boolean;
  onCreate: () => void | Promise<void>;
  onResync?: () => void | Promise<void>;
}

export function GenerateFromNotePanel({
  noteId,
  noteTitle,
  body,
  existingBoard,
  loading = false,
  onCreate,
  onResync,
}: GenerateFromNotePanelProps) {
  const [includePlainListItems, setIncludePlainListItems] = useState(true);
  const activities = useMemo(
    () => recognizeKanbanActivities(body, { includePlainListItems }),
    [body, includePlainListItems]
  );
  const preview = useMemo(
    () =>
      createKanbanBoardFromNote(noteId, noteTitle, body, {
        includePlainListItems,
        boardId: "00000000-0000-4000-8000-000000000000",
        createId: () => crypto.randomUUID(),
      }),
    [body, includePlainListItems, noteId, noteTitle]
  );

  if (existingBoard) {
    return (
      <Alert variant="info" data-testid="kanban-existing-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>This note already has a Kanban board. Re-sync adds newly recognized items only.</span>
          {onResync && (
            <Button type="button" variant="secondary" disabled={loading} onClick={() => void onResync()}>
              Re-sync from note
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  if (activities.length === 0) {
    return (
      <Alert variant="muted" data-testid="kanban-no-activities">
        No checklist or list activities were found in this note yet.
      </Alert>
    );
  }

  return (
    <section
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
      data-testid="kanban-generate-panel"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Generate Kanban</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Found {activities.length} private activities. Preview them before creating a board.
          </p>
        </div>
        <Button type="button" disabled={loading} onClick={() => void onCreate()}>
          {loading ? "Generating..." : "Create board"}
        </Button>
      </div>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--fg-2)]">
        <input
          type="checkbox"
          checked={includePlainListItems}
          onChange={(event) => setIncludePlainListItems(event.target.checked)}
        />
        Include plain list items
      </label>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {preview.cards.slice(0, 8).map((card) => (
          <div
            key={card.id}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-2)] p-3"
          >
            <p className="text-sm font-semibold">{card.title}</p>
            {card.description && (
              <p className="mt-1 text-xs text-[var(--muted)]">{card.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
