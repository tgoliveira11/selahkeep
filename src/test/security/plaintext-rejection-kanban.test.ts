import { describe, it, expect } from "vitest";
import {
  assertNoPlaintextKanbanFields,
  PlaintextRejectionError,
} from "@/server/policies/kanban-plaintext-rejection";
import { rejectPlaintextKanbanFields } from "@/lib/validation/kanban";
import { rejectPlaintextNoteFields } from "@/lib/validation/notes";
import { createKanbanBoardInput } from "@/test/helpers/fixtures";

describe("kanban plaintext rejection", () => {
  it("rejects plaintext board structure fields", () => {
    for (const field of [
      "kanban",
      "board",
      "columns",
      "cards",
      "column",
      "card",
      "boardState",
      "labels",
      "priority",
      "dueDate",
      "title",
      "description",
    ] as const) {
      expect(rejectPlaintextKanbanFields({ [field]: "secret" })).toContain(field);
    }
  });

  it("allows encrypted-only kanban payloads", () => {
    expect(rejectPlaintextKanbanFields(createKanbanBoardInput())).toBeNull();
  });

  it("throws PlaintextRejectionError from the policy wrapper", () => {
    expect(() => assertNoPlaintextKanbanFields({ card: "secret" })).toThrow(
      PlaintextRejectionError
    );
  });

  it("extends the shared note plaintext guard for kanban route prechecks", () => {
    for (const field of [
      "kanban",
      "board",
      "columns",
      "cards",
      "column",
      "card",
      "boardState",
      "labels",
      "priority",
      "dueDate",
      "title",
    ] as const) {
      expect(rejectPlaintextNoteFields({ [field]: "secret" })).toContain(field);
    }
  });
});
