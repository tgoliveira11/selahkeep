import { describe, expect, it } from "vitest";
import { createKanbanBoardFromNote } from "@/lib/notes/kanban-from-note";
import {
  buildNoteBodyFromBoard,
  syncBoardFromNoteBody,
  syncNoteAndBoardFromBoardChange,
  syncNoteAndBoardFromNoteChange,
  syncNoteBodyFromBoard,
} from "@/lib/notes/kanban-sync";
import { moveKanbanCard } from "@/lib/notes/kanban-progress";
import { NOTE_ID } from "@/test/helpers/fixtures";

const ids = ["board", "todo", "doing", "done", "c1", "c2", "c3", "c4", "c5"];

function idFactory() {
  let index = 0;
  return () => ids[index++] ?? `id-${index}`;
}

function noteBoard(body: string) {
  return createKanbanBoardFromNote(NOTE_ID, "My note", body, {
    now: "2026-06-30T00:00:00.000Z",
    createId: idFactory(),
  });
}

describe("kanban-sync", () => {
  it("syncs note checklist toggle to board column", () => {
    const board = noteBoard("- [ ] Open task\n- [x] Done task");
    const result = syncBoardFromNoteBody(board, "- [x] Open task\n- [x] Done task");
    const doneColumn = board.columns.find((column) => column.isDoneColumn)!;

    expect(result.changed).toBe(true);
    expect(result.updated).toBe(1);
    expect(result.board.cards.find((card) => card.title === "Open task")?.columnId).toBe(
      doneColumn.id
    );
  });

  it("syncs new note activities onto the board", () => {
    const board = noteBoard("- [ ] Existing");
    const result = syncBoardFromNoteBody(board, "- [ ] Existing\n- [ ] Brand new");

    expect(result.changed).toBe(true);
    expect(result.added).toBe(1);
    expect(result.board.cards).toHaveLength(2);
  });

  it("removes board cards when note lines are deleted", () => {
    const board = noteBoard("- [ ] Keep\n- [ ] Remove me");
    const result = syncBoardFromNoteBody(board, "- [ ] Keep");

    expect(result.changed).toBe(true);
    expect(result.removed).toBe(1);
    expect(result.board.cards).toHaveLength(1);
    expect(result.board.cards[0].title).toBe("Keep");
  });

  it("preserves in-progress column when note item carries the column tag", () => {
    const board = noteBoard("- [ ] Task");
    const inProgress = board.columns.find((column) => column.title === "In Progress")!;
    const moved = moveKanbanCard(board, board.cards[0].id, inProgress.id);
    const noteSync = syncNoteBodyFromBoard(moved, "- [ ] Task");
    const result = syncBoardFromNoteBody(noteSync.board, noteSync.body);

    expect(noteSync.body).toContain("[IN PROGRESS]");
    expect(result.board.cards[0].columnId).toBe(inProgress.id);
  });

  it("writes board completion back to note checklists", () => {
    const board = noteBoard("- [ ] Task");
    const doneColumn = board.columns.find((column) => column.isDoneColumn)!;
    const completed = moveKanbanCard(board, board.cards[0].id, doneColumn.id);
    const result = syncNoteBodyFromBoard(completed, "- [ ] Task");

    expect(result.changed).toBe(true);
    expect(result.body).toContain("- [x] Task");
  });

  it("updates note line titles when card titles change", () => {
    const board = noteBoard("- [ ] Old title");
    const card = board.cards[0];
    const renamed = {
      ...board,
      cards: [{ ...card, title: "New title" }],
    };
    const result = syncNoteBodyFromBoard(renamed, "- [ ] Old title");

    expect(result.changed).toBe(true);
    expect(result.body).toContain("- [ ] New title");
    expect(result.body).not.toContain("Old title");
  });

  it("appends manual cards to the note as checklist items", () => {
    const board = noteBoard("- [ ] Existing");
    const todo = board.columns.find((column) => column.title === "To Do")!;
    const manual = {
      ...board,
      cards: [
        ...board.cards,
        {
          id: "manual-1",
          columnId: todo.id,
          title: "Manual card",
          order: 1,
          labelIds: [],
          priority: null,
          dueDate: null,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt,
          source: { kind: "manual" as const },
        },
      ],
    };
    const result = syncNoteBodyFromBoard(manual, "- [ ] Existing");

    expect(result.changed).toBe(true);
    expect(result.body).toContain("- [ ] Manual card");
    expect(
      result.board.cards.find((card) => card.title === "Manual card")?.source?.key
    ).toBeTruthy();
  });

  it("converges note and board through combined sync helpers", () => {
    const board = noteBoard("- [ ] Alpha\n- [ ] Beta");
    const noteResult = syncNoteAndBoardFromNoteChange(board, "- [ ] Alpha\n- [ ] Beta\n- [ ] Gamma");
    expect(noteResult.body).toContain("- [ ] Gamma");
    expect(noteResult.board.cards).toHaveLength(3);

    const doneColumn = board.columns.find((column) => column.isDoneColumn)!;
    const completed = moveKanbanCard(noteResult.board, noteResult.board.cards[0].id, doneColumn.id);
    const boardResult = syncNoteAndBoardFromBoardChange(completed, noteResult.body);
    expect(boardResult.body).toContain("- [x] Alpha");
  });

  it("syncs per-item note descriptions to cards", () => {
    const body = `- [ ] Task A

Context for B

- [ ] Task B`;
    const board = noteBoard(body);

    expect(board.cards.find((card) => card.title === "Task A")?.description).toBe("Context for B");
    expect(board.cards.find((card) => card.title === "Task B")?.description).toBeUndefined();
  });

  it("writes card description edits back to note prose between items", () => {
    const body = `- [ ] Task A

- [ ] Task B`;
    const board = noteBoard(body);
    const taskB = board.cards.find((card) => card.title === "Task B")!;
    const edited = {
      ...board,
      cards: board.cards.map((card) =>
        card.id === taskB.id ? { ...card, description: "Updated context" } : card
      ),
    };

    const result = syncNoteBodyFromBoard(edited, body);

    expect(result.changed).toBe(true);
    expect(result.body).toContain("Updated context");
    expect(result.body).toMatch(/- \[ \] Task B\nUpdated context/);
    expect(
      result.board.cards.find((card) => card.title === "Task B")?.description
    ).toBe("Updated context");
  });

  it("updates card descriptions when per-item note prose changes", () => {
    const body = `- [ ] Task A

Original context

- [ ] Task B`;
    const board = noteBoard(body);
    const result = syncBoardFromNoteBody(
      board,
      `- [ ] Task A

Revised context

- [ ] Task B`
    );

    expect(result.changed).toBe(true);
    expect(result.board.cards.find((card) => card.title === "Task A")?.description).toBe(
      "Revised context"
    );
  });

  it("builds a fresh note body from a standalone board's cards", () => {
    const board = noteBoard("- [ ] Buy milk\n- [ ] Call mom\n- [x] Done thing");
    const standalone = { ...board, scope: "standalone" as const, noteId: null };

    const body = buildNoteBodyFromBoard(standalone);

    expect(body).toBe("- [ ] Buy milk\n- [ ] Call mom\n- [x] Done thing");
  });

  it("round-trips a board built from scratch through the note parser", () => {
    const board = noteBoard("- [ ] Buy milk\n- [ ] Call mom");
    const body = buildNoteBodyFromBoard({ ...board, scope: "standalone" as const, noteId: null });
    const reparsed = noteBoard(body);

    expect(reparsed.cards.map((card) => card.title)).toEqual(["Buy milk", "Call mom"]);
  });

  it("protects a checklist/bullet inside a card description from being read back as a sibling card", () => {
    const body = "- [ ] Card A\n- [ ] Card B";
    const board = noteBoard(body);
    const cardA = board.cards.find((card) => card.title === "Card A")!;
    const withDescription = {
      ...board,
      cards: board.cards.map((card) =>
        card.id === cardA.id
          ? { ...card, description: "- [ ] sub item\n- another point" }
          : card
      ),
    };

    const result = syncNoteBodyFromBoard(withDescription, body);

    // The description's list syntax must be indented in the note body so it
    // isn't re-classified as a top-level item on the next parse.
    expect(result.body).toContain("  - [ ] sub item");
    expect(result.body).toContain("  - another point");

    const reparsed = createKanbanBoardFromNote(NOTE_ID, "My note", result.body, {
      now: "2026-06-30T00:00:00.000Z",
      createId: idFactory(),
    });

    // Exactly the two original cards — no phantom "sub item"/"another point" cards.
    expect(reparsed.cards.map((card) => card.title)).toEqual(["Card A", "Card B"]);
    expect(reparsed.cards[0].description).toBe("- [ ] sub item\n- another point");
  });
});
