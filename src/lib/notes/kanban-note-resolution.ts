import { getKanbanProgress } from "@/lib/notes/kanban-progress";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";

/** Whether a note-bound board drives resolved status (all cards in done columns). */
export function isKanbanBoardLinked(
  board: KanbanBoardPlaintext | null | undefined
): board is KanbanBoardPlaintext {
  return Boolean(board && board.scope === "note");
}

export function isNoteResolvedByKanbanBoard(
  board: KanbanBoardPlaintext | null | undefined
): boolean {
  if (!isKanbanBoardLinked(board)) return false;
  const progress = getKanbanProgress(board);
  return progress.total > 0 && progress.complete;
}

export function shouldSyncNoteResolvedFromKanban(
  board: KanbanBoardPlaintext | null | undefined,
  answered: boolean
): boolean | null {
  if (!isKanbanBoardLinked(board)) return null;
  const progress = getKanbanProgress(board);
  if (progress.total === 0) return null;
  const target = progress.complete;
  return target === answered ? null : target;
}
