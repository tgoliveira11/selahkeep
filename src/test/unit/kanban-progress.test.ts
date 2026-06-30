import { describe, expect, it } from "vitest";
import {
  canDeleteKanbanColumn,
  getKanbanProgress,
  moveKanbanCard,
} from "@/lib/notes/kanban-progress";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import { BOARD_ID, NOTE_ID } from "@/test/helpers/fixtures";

function board(): KanbanBoardPlaintext {
  const columns = [
    { id: "todo", title: "To Do", order: 0, isDoneColumn: false },
    { id: "done", title: "Done", order: 1, isDoneColumn: true },
  ];
  return {
    schemaVersion: 1,
    boardId: BOARD_ID,
    scope: "note",
    noteId: NOTE_ID,
    title: "Board",
    columns,
    labels: [],
    cards: [
      {
        id: "a",
        columnId: "todo",
        title: "A",
        order: 0,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      },
      {
        id: "b",
        columnId: "done",
        title: "B",
        order: 0,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      },
    ],
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  };
}

describe("kanban-progress", () => {
  it("computes counts, percent, and completion", () => {
    expect(getKanbanProgress(board())).toMatchObject({
      total: 2,
      done: 1,
      percent: 50,
      complete: false,
    });

    const complete = moveKanbanCard(board(), "a", "done");
    expect(getKanbanProgress(complete)).toMatchObject({
      total: 2,
      done: 2,
      percent: 100,
      complete: true,
    });
  });

  it("does not treat an empty board as complete", () => {
    const empty = { ...board(), cards: [] };
    expect(getKanbanProgress(empty)).toMatchObject({
      total: 0,
      done: 0,
      percent: 0,
      complete: false,
    });
  });

  it("guards the last done column", () => {
    const current = board();
    expect(canDeleteKanbanColumn(current.columns, "done")).toBe(false);
    expect(
      canDeleteKanbanColumn(
        [...current.columns, { id: "closed", title: "Closed", order: 2, isDoneColumn: true }],
        "done"
      )
    ).toBe(true);
  });

  it("moves cards and keeps orders contiguous", () => {
    const moved = moveKanbanCard(board(), "a", "done", 0);
    const doneCards = moved.cards
      .filter((card) => card.columnId === "done")
      .sort((a, b) => a.order - b.order);

    expect(doneCards.map((card) => card.id)).toEqual(["a", "b"]);
    expect(doneCards.map((card) => card.order)).toEqual([0, 1]);
  });
});
