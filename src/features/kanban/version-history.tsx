"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatNoteDateTime } from "@/lib/notes/note-dates";
import { useKanbanVersions } from "@/features/notes/use-kanban";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import type { KanbanBoardVersionResponse } from "@/lib/api-client/kanban";

interface KanbanVersionHistoryProps {
  boardId: string;
  enabled: boolean;
  currentBoard: KanbanBoardPlaintext;
  onRestore?: (board: KanbanBoardPlaintext) => void | Promise<void>;
}

function describeBoardDiff(before: KanbanBoardPlaintext, after: KanbanBoardPlaintext): string[] {
  const beforeCards = new Map(before.cards.map((card) => [card.id, card]));
  const afterCards = new Map(after.cards.map((card) => [card.id, card]));
  const beforeColumns = new Map(before.columns.map((column) => [column.id, column.title]));
  const afterColumns = new Map(after.columns.map((column) => [column.id, column.title]));
  const lines: string[] = [];

  for (const card of after.cards) {
    const previous = beforeCards.get(card.id);
    if (!previous) lines.push(`Added card: ${card.title}`);
    else if (previous.columnId !== card.columnId) {
      lines.push(
        `Moved ${card.title}: ${beforeColumns.get(previous.columnId) ?? "Unknown"} -> ${afterColumns.get(card.columnId) ?? "Unknown"}`
      );
    } else if (previous.title !== card.title) {
      lines.push(`Renamed card: ${previous.title} -> ${card.title}`);
    }
  }
  for (const card of before.cards) {
    if (!afterCards.has(card.id)) lines.push(`Removed card: ${card.title}`);
  }
  for (const column of after.columns) {
    const previousTitle = beforeColumns.get(column.id);
    if (!previousTitle) lines.push(`Added column: ${column.title}`);
    else if (previousTitle !== column.title) lines.push(`Renamed column: ${previousTitle} -> ${column.title}`);
  }
  for (const column of before.columns) {
    if (!afterColumns.has(column.id)) lines.push(`Removed column: ${column.title}`);
  }

  return lines.length > 0 ? lines : ["No board differences."];
}

export function KanbanVersionHistory({
  boardId,
  enabled,
  currentBoard,
  onRestore,
}: KanbanVersionHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const { versions, loading, error, reload, loadVersionContent } = useKanbanVersions(
    boardId,
    enabled && expanded
  );
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<KanbanBoardPlaintext | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<KanbanBoardVersionResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versions[0].id);
    }
  }, [selectedVersionId, versions]);

  useEffect(() => {
    if (!selectedVersionId) return;
    let cancelled = false;
    const version = versions.find((item) => item.id === selectedVersionId);
    if (!version) return;
    void loadVersionContent(version).then((board) => {
      if (!cancelled) setSelectedBoard(board);
    });
    return () => {
      cancelled = true;
    };
  }, [loadVersionContent, selectedVersionId, versions]);

  const diffLines = useMemo(
    () => (selectedBoard ? describeBoardDiff(selectedBoard, currentBoard) : []),
    [currentBoard, selectedBoard]
  );

  const confirmRestore = useCallback(async () => {
    if (!restoreTarget || !onRestore) return;
    setActionError(null);
    try {
      const board = await loadVersionContent(restoreTarget);
      await onRestore(board);
      setRestoreTarget(null);
      await reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to restore board");
    }
  }, [loadVersionContent, onRestore, reload, restoreTarget]);

  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4" data-testid="kanban-version-history">
      <Button
        type="button"
        variant="secondary"
        aria-expanded={expanded}
        data-testid="kanban-version-history-toggle"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide board history" : "Board history"}
      </Button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {loading && <p className="text-sm text-[var(--muted)]">Loading board history...</p>}
          {error && <Alert variant="danger">{error}</Alert>}
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          {!loading && versions.length === 0 && !error && (
            <p className="text-sm text-[var(--muted)]" data-testid="kanban-no-versions">
              No previous board snapshots yet.
            </p>
          )}
          {versions.length > 0 && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Compare version</span>
                <select
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                  value={selectedVersionId}
                  onChange={(event) => setSelectedVersionId(event.target.value)}
                  data-testid="kanban-version-select"
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      Version {version.versionNumber} - {formatNoteDateTime(version.createdAt)}
                    </option>
                  ))}
                </select>
              </label>

              <div
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-2)] p-3"
                data-testid="kanban-version-diff"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Semantic diff
                </p>
                <ul className="space-y-1 text-sm text-[var(--fg-2)]">
                  {diffLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <ol className="space-y-2" data-testid="kanban-version-list">
                {versions.map((version) => (
                  <li
                    key={version.id}
                    className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`kanban-version-row-${version.versionNumber}`}
                  >
                    <span>
                      Version {version.versionNumber} - {formatNoteDateTime(version.createdAt)}
                    </span>
                    {onRestore && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setRestoreTarget(version)}
                        data-testid={`kanban-version-restore-${version.versionNumber}`}
                      >
                        Restore
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restore board version?"
        description="This replaces the current board with that snapshot and keeps history append-only."
        confirmLabel="Restore board"
        loading={false}
        onConfirm={() => void confirmRestore()}
        onCancel={() => setRestoreTarget(null)}
      />
    </section>
  );
}
