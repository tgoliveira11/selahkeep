/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useKanbanNoteToBoardSync } from "@/features/notes/use-kanban-note-to-board-sync";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import { BOARD_ID, NOTE_ID } from "@/test/helpers/fixtures";

function noteBoard(body: string): KanbanBoardPlaintext {
  return {
    schemaVersion: 1,
    boardId: BOARD_ID,
    scope: "note",
    noteId: NOTE_ID,
    title: "Note board",
    columns: [
      { id: "todo", title: "To Do", order: 0, isDoneColumn: false },
      { id: "done", title: "Done", order: 1, isDoneColumn: true },
    ],
    cards: [
      {
        id: "card-1",
        columnId: "todo",
        title: "Task",
        order: 0,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
        source: { kind: "checklist", key: "task" },
      },
    ],
    labels: [],
    generatedFrom: { at: "2026-06-30T00:00:00.000Z", bodyHash: "abc" },
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  };
}

describe("useKanbanNoteToBoardSync", () => {
  it("syncs board from note edits without rewriting note body", async () => {
    const board = noteBoard("- [ ] Task");
    const saveBoard = vi.fn().mockResolvedValue(board);
    const wrappedKey = {} as never;

    const { rerender } = renderHook(
      ({ body }) =>
        useKanbanNoteToBoardSync({
          body,
          board,
          enabled: true,
          encryptedWrappedKey: wrappedKey,
          saveBoard,
        }),
      { initialProps: { body: "- [ ] Task" } }
    );

    rerender({ body: "- [ ] Task updated" });

    await waitFor(() => expect(saveBoard).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });
});
