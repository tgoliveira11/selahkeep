import { describe, it, expect } from "vitest";
import {
  assertKanbanBoardAad,
  assertKanbanVersionAad,
  AadValidationError,
} from "@/server/policies/aad-validation";
import {
  createKanbanBoardInput,
  createKanbanVersionInput,
  KANBAN_BOARD_ID,
  KANBAN_VERSION_ID,
  NOTE_ID,
  USER_ID,
} from "@/test/helpers/fixtures";

describe("kanban AAD tamper rejection", () => {
  it("rejects board content bound to a different board id", () => {
    const input = createKanbanBoardInput({ noteId: NOTE_ID });
    const tampered = {
      ...input,
      encryptedBoard: {
        ...input.encryptedBoard,
        aad: { ...input.encryptedBoard.aad, resourceId: "00000000-0000-0000-0000-000000000099" },
      },
    };

    expect(() =>
      assertKanbanBoardAad(USER_ID, KANBAN_BOARD_ID, NOTE_ID, tampered)
    ).toThrow(AadValidationError);
  });

  it("rejects standalone board wrapped with note_key scope", () => {
    const input = createKanbanBoardInput({ noteId: null });
    const tampered = {
      ...input,
      encryptedWrappedKey: {
        ...input.encryptedWrappedKey,
        aad: { ...input.encryptedWrappedKey.aad, field: "note_key", resourceId: NOTE_ID },
      },
    };

    expect(() =>
      assertKanbanBoardAad(USER_ID, KANBAN_BOARD_ID, null, tampered)
    ).toThrow(AadValidationError);
  });

  it("rejects version content bound to a different version id", () => {
    const input = createKanbanVersionInput({ noteId: NOTE_ID });
    const tampered = {
      ...input,
      encryptedBoard: {
        ...input.encryptedBoard,
        aad: { ...input.encryptedBoard.aad, resourceId: "00000000-0000-0000-0000-000000000099" },
      },
    };

    expect(() =>
      assertKanbanVersionAad(USER_ID, KANBAN_BOARD_ID, KANBAN_VERSION_ID, NOTE_ID, tampered)
    ).toThrow(AadValidationError);
  });
});
