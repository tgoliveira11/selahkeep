import { describe, it, expect, beforeEach } from "vitest";
import { encryptNote } from "@/lib/crypto-client/notes";
import {
  decryptKanbanBoard,
  decryptKanbanVersion,
  encryptKanbanBoard,
  encryptKanbanVersion,
  generateBoardKey,
  unwrapBoardKey,
  unwrapContentKey,
  wrapBoardKey,
} from "@/lib/crypto-client/kanban";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { NOTE_ID, USER_ID, VERSION_ID } from "@/test/helpers/fixtures";

const BOARD_ID = "550e8400-e29b-41d4-a716-446655440010";
const OTHER_BOARD_ID = "550e8400-e29b-41d4-a716-446655440011";

function makeBoard(
  overrides: Partial<KanbanBoardPlaintext> = {}
): KanbanBoardPlaintext {
  const now = "2026-06-30T12:00:00.000Z";
  return {
    schemaVersion: 1,
    boardId: BOARD_ID,
    scope: "note",
    noteId: NOTE_ID,
    title: "Prayer practices",
    columns: [
      { id: "todo", title: "To Do", order: 0, isDoneColumn: false },
      { id: "done", title: "Done", order: 1, isDoneColumn: true },
    ],
    cards: [
      {
        id: "card-1",
        columnId: "todo",
        title: "Reflect",
        description: "Read the note again.",
        order: 0,
        dueDate: "2026-07-01",
        priority: "high",
        labelIds: ["label-1"],
        createdAt: now,
        updatedAt: now,
        source: { kind: "checklist", key: "reflect" },
      },
    ],
    labels: [{ id: "label-1", name: "Spiritual practice", color: "lilac" }],
    generatedFrom: { at: now, bodyHash: "body-hash" },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function makeNoteBoundWrappedKey() {
  const note = await encryptNote(USER_ID, NOTE_ID, {
    title: "Source note",
    body: "body",
  });
  return note.encryptedWrappedNoteKey;
}

describe("kanban encryption", () => {
  beforeEach(async () => {
    setSessionVaultKey(await generateUserVaultKey());
  });

  it("round-trips a note-bound board under the note's existing key", async () => {
    const wrappedNoteKey = await makeNoteBoundWrappedKey();
    const board = makeBoard();

    const encrypted = await encryptKanbanBoard(USER_ID, BOARD_ID, board, wrappedNoteKey);

    expect(encrypted.id).toBe(BOARD_ID);
    expect(encrypted.encryptedBoard.aad.resourceId).toBe(BOARD_ID);
    expect(encrypted.encryptedBoard.aad.field).toBe("note_kanban_board");
    expect(encrypted.encryptedWrappedKey).toEqual(wrappedNoteKey);

    const decrypted = await decryptKanbanBoard(
      encrypted.encryptedBoard,
      encrypted.encryptedWrappedKey
    );
    expect(decrypted).toEqual(board);
  });

  it("round-trips a standalone board under a wrapped board key", async () => {
    const boardKey = await generateBoardKey();
    const wrappedBoardKey = await wrapBoardKey(USER_ID, BOARD_ID, boardKey);
    const board = makeBoard({ scope: "standalone", noteId: null });

    const encrypted = await encryptKanbanBoard(USER_ID, BOARD_ID, board, wrappedBoardKey);

    expect(wrappedBoardKey.aad.field).toBe("note_kanban_key");
    expect(wrappedBoardKey.aad.resourceId).toBe(BOARD_ID);
    await expect(unwrapBoardKey(wrappedBoardKey)).resolves.toBeDefined();
    await expect(unwrapContentKey(wrappedBoardKey)).resolves.toBeDefined();
    await expect(
      decryptKanbanBoard(encrypted.encryptedBoard, encrypted.encryptedWrappedKey)
    ).resolves.toEqual(board);
  });

  it("round-trips a kanban version bound to the version id", async () => {
    const wrappedNoteKey = await makeNoteBoundWrappedKey();
    const board = makeBoard();

    const version = await encryptKanbanVersion(USER_ID, VERSION_ID, board, wrappedNoteKey);

    expect(version.id).toBe(VERSION_ID);
    expect(version.encryptedBoard.aad.resourceId).toBe(VERSION_ID);
    expect(version.encryptedBoard.aad.field).toBe("note_kanban_version");
    expect(version.encryptedWrappedKey).toEqual(wrappedNoteKey);
    await expect(
      decryptKanbanVersion(version.encryptedBoard, version.encryptedWrappedKey)
    ).resolves.toEqual(board);
  });

  it("rejects board content with tampered AAD", async () => {
    const wrappedNoteKey = await makeNoteBoundWrappedKey();
    const encrypted = await encryptKanbanBoard(USER_ID, BOARD_ID, makeBoard(), wrappedNoteKey);
    const tampered = {
      ...encrypted.encryptedBoard,
      aad: { ...encrypted.encryptedBoard.aad, resourceId: OTHER_BOARD_ID },
    };

    await expect(
      decryptKanbanBoard(tampered, encrypted.encryptedWrappedKey)
    ).rejects.toThrow();
  });

  it("does not decrypt standalone content with another board key", async () => {
    const wrappedBoardKey = await wrapBoardKey(USER_ID, BOARD_ID, await generateBoardKey());
    const otherWrappedBoardKey = await wrapBoardKey(
      USER_ID,
      OTHER_BOARD_ID,
      await generateBoardKey()
    );
    const encrypted = await encryptKanbanBoard(
      USER_ID,
      BOARD_ID,
      makeBoard({ scope: "standalone", noteId: null }),
      wrappedBoardKey
    );

    await expect(
      decryptKanbanBoard(encrypted.encryptedBoard, otherWrappedBoardKey)
    ).rejects.toThrow();
  });

  it("fails closed when the vault is locked", async () => {
    const wrappedNoteKey = await makeNoteBoundWrappedKey();
    setSessionVaultKey(null);

    await expect(
      encryptKanbanBoard(USER_ID, BOARD_ID, makeBoard(), wrappedNoteKey)
    ).rejects.toThrow("Vault is locked");
  });
});
