import { describe, expect, it } from "vitest";
import {
  isKanbanBoardLinked,
  isNoteResolvedByKanbanBoard,
  shouldSyncNoteResolvedFromKanban,
} from "@/lib/notes/kanban-note-resolution";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import { BOARD_ID, NOTE_ID } from "@/test/helpers/fixtures";

function sampleBoard(cards: KanbanBoardPlaintext["cards"]): KanbanBoardPlaintext {
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
    cards,
    labels: [],
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  };
}

describe("kanban-note-resolution", () => {
  it("detects linked note boards", () => {
    expect(isKanbanBoardLinked(sampleBoard([]))).toBe(true);
    expect(isKanbanBoardLinked({ ...sampleBoard([]), scope: "standalone", noteId: null })).toBe(
      false
    );
    expect(isKanbanBoardLinked(null)).toBe(false);
  });

  it("marks notes resolved only when every card is in a done column", () => {
    const open = sampleBoard([
      {
        id: "c1",
        columnId: "todo",
        title: "Task",
        order: 0,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      },
    ]);
    const complete = sampleBoard([
      {
        id: "c1",
        columnId: "done",
        title: "Task",
        order: 0,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      },
    ]);

    expect(isNoteResolvedByKanbanBoard(open)).toBe(false);
    expect(isNoteResolvedByKanbanBoard(complete)).toBe(true);
    expect(isNoteResolvedByKanbanBoard(sampleBoard([]))).toBe(false);
  });

  it("returns the target answered state only when metadata is out of sync", () => {
    const complete = sampleBoard([
      {
        id: "c1",
        columnId: "done",
        title: "Task",
        order: 0,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      },
    ]);

    expect(shouldSyncNoteResolvedFromKanban(complete, false)).toBe(true);
    expect(shouldSyncNoteResolvedFromKanban(complete, true)).toBeNull();
  });
});
