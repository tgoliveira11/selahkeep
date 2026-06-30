import { describe, expect, it } from "vitest";
import {
  createKanbanBoardFromNote,
  mergeKanbanBoardFromNote,
  normalizeKanbanSourceText,
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

  it("recognizes checklists, plain lists, headings, and ignores prose/code", () => {
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
      "Send update",
      "Review notes",
    ]);
    expect(activities[0]).toMatchObject({ checked: false, kind: "checklist", section: "Care" });
    expect(activities[1]).toMatchObject({ checked: true, kind: "checklist", section: "Care" });
    expect(activities[2]).toMatchObject({ checked: false, kind: "list", section: "Work" });
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
});
