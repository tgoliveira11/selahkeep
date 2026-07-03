import { describe, expect, it } from "vitest";
import {
  createKanbanBoardFromNote,
  mergeKanbanBoardFromNote,
  normalizeKanbanSourceText,
  parseKanbanNoteGroups,
  recognizeKanbanActivities,
} from "@/lib/notes/kanban-from-note";
import { NOTE_ID } from "@/test/helpers/fixtures";

const ids = ["board", "todo", "doing", "done", "c1", "c2", "c3", "c4", "c5"];

function idFactory() {
  let index = 0;
  return () => ids[index++] ?? `id-${index}`;
}

describe("kanban-from-note", () => {
  it("normalizes source text for stable de-duplication", () => {
    expect(normalizeKanbanSourceText("  Call Mom!!!  ")).toBe("call mom");
    expect(normalizeKanbanSourceText("- [x]  Follow up.")).toBe("- follow up");
  });

  it("recognizes checklists and bullets only, ignoring prose and code", () => {
    const activities = recognizeKanbanActivities(`
## Care
- [ ] Call mom
- [x] Book appointment

Plain prose
> - quoted item

\`\`\`
- hidden code item
\`\`\`

### Work
1. Send update
* Review notes
`);

    expect(activities.map((activity) => activity.title)).toEqual([
      "Call mom",
      "Book appointment",
      "Review notes",
    ]);
    expect(activities[0]).toMatchObject({ checked: false, kind: "checklist" });
    expect(activities[1]).toMatchObject({ checked: true, kind: "checklist" });
    expect(activities[2]).toMatchObject({ checked: false, kind: "list" });
  });

  it("creates a note-scoped board with checked cards in the done column", () => {
    const board = createKanbanBoardFromNote(
      NOTE_ID,
      "My note",
      "- [ ] Open task\n- [x] Done task",
      { now: "2026-06-30T00:00:00.000Z", createId: idFactory() }
    );
    const doneColumn = board.columns.find((column) => column.isDoneColumn)!;

    expect(board.scope).toBe("note");
    expect(board.noteId).toBe(NOTE_ID);
    expect(board.cards).toHaveLength(2);
    expect(board.cards.find((card) => card.title === "Done task")?.columnId).toBe(doneColumn.id);
    expect(board.generatedFrom?.bodyHash).toBeTruthy();
  });

  it("merges re-sync additively without moving existing cards", () => {
    const board = createKanbanBoardFromNote(NOTE_ID, "My note", "- [ ] Existing", {
      now: "2026-06-30T00:00:00.000Z",
      createId: idFactory(),
    });
    const moved = { ...board, cards: [{ ...board.cards[0], columnId: board.columns[1].id }] };

    const result = mergeKanbanBoardFromNote(moved, "- [ ] Existing\n- [ ] New task", {
      now: "2026-06-30T00:01:00.000Z",
      createId: () => "new-card",
    });

    expect(result.added).toBe(1);
    expect(result.board.cards).toHaveLength(2);
    expect(result.board.cards[0].columnId).toBe(board.columns[1].id);
    expect(result.board.cards[1]).toMatchObject({ id: "new-card", title: "New task" });
  });

  it("maps per-item description between list items", () => {
    const body = `- [ ] Task A

Context for B

- [ ] Task B

- [ ] Task C`;

    const groups = parseKanbanNoteGroups(body);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((item) => item.title)).toEqual(["Task A", "Task B", "Task C"]);
    expect(groups[0].items[0].description).toBe("Context for B");
    expect(groups[0].items[1].description).toBeUndefined();

    const board = createKanbanBoardFromNote(NOTE_ID, "Grouped", body, {
      now: "2026-06-30T00:00:00.000Z",
      createId: idFactory(),
    });

    expect(board.cards.find((card) => card.title === "Task A")?.description).toBe("Context for B");
    expect(board.cards.find((card) => card.title === "Task B")?.description).toBeUndefined();
  });

  it("ignores prose before the first list item", () => {
    const body = `Context for care tasks

## Care
- [ ] Call mom`;

    const board = createKanbanBoardFromNote(NOTE_ID, "Care", body, {
      now: "2026-06-30T00:00:00.000Z",
      createId: idFactory(),
    });

    expect(board.cards[0].description).toBeUndefined();
  });

  it("does not treat an indented list-like description line as a new card", () => {
    const body = "- [ ] Card A\n  - [ ] sub item\n- [ ] Card B";
    const board = createKanbanBoardFromNote(NOTE_ID, "Work", body, {
      now: "2026-06-30T00:00:00.000Z",
      createId: idFactory(),
    });

    expect(board.cards.map((card) => card.title)).toEqual(["Card A", "Card B"]);
    expect(board.cards[0].description).toBe("- [ ] sub item");
  });

  it("still treats an unindented list-like line as a sibling card (regression guard)", () => {
    const body = "- [ ] Card A\n- [ ] sub item\n- [ ] Card B";
    const board = createKanbanBoardFromNote(NOTE_ID, "Work", body, {
      now: "2026-06-30T00:00:00.000Z",
      createId: idFactory(),
    });

    expect(board.cards.map((card) => card.title)).toEqual(["Card A", "sub item", "Card B"]);
  });

  it("places cards with [IN PROGRESS] tags in the matching column", () => {
    const body = "- [ ] [IN PROGRESS] Active task";
    const board = createKanbanBoardFromNote(NOTE_ID, "Work", body, {
      now: "2026-06-30T00:00:00.000Z",
      createId: idFactory(),
    });
    const inProgress = board.columns.find((column) => column.title === "In Progress")!;

    expect(board.cards[0].title).toBe("Active task");
    expect(board.cards[0].columnId).toBe(inProgress.id);
  });
});
