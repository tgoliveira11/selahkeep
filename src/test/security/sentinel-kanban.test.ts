import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, beforeEach } from "vitest";
import { encryptNote } from "@/lib/crypto-client/notes";
import {
  encryptKanbanBoard,
  encryptKanbanVersion,
  generateBoardKey,
  wrapBoardKey,
} from "@/lib/crypto-client/kanban";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { SENTINEL_PHRASE } from "./sentinel-phrase.test";
import { NOTE_ID, USER_ID, VERSION_ID } from "@/test/helpers/fixtures";

const BOARD_ID = "550e8400-e29b-41d4-a716-446655440010";

function sentinelBoard(scope: "note" | "standalone"): KanbanBoardPlaintext {
  const now = "2026-06-30T12:00:00.000Z";
  return {
    schemaVersion: 1,
    boardId: BOARD_ID,
    scope,
    noteId: scope === "note" ? NOTE_ID : null,
    title: SENTINEL_PHRASE,
    columns: [
      { id: "todo", title: "To Do", order: 0, isDoneColumn: false },
      { id: "done", title: "Done", order: 1, isDoneColumn: true },
    ],
    cards: [
      {
        id: "card-1",
        columnId: "todo",
        title: SENTINEL_PHRASE,
        description: SENTINEL_PHRASE,
        order: 0,
        dueDate: "2026-07-01",
        priority: "urgent",
        labelIds: ["label-1"],
        createdAt: now,
        updatedAt: now,
        source: { kind: "manual", key: SENTINEL_PHRASE },
      },
    ],
    labels: [{ id: "label-1", name: SENTINEL_PHRASE, color: "danger" }],
    generatedFrom: { at: now, bodyHash: SENTINEL_PHRASE },
    createdAt: now,
    updatedAt: now,
  };
}

describe("sentinel phrase kanban encryption", () => {
  beforeEach(async () => {
    await unlockVaultSession(await generateUserVaultKey());
  });

  it("never exposes sentinel plaintext in note-bound board or version payloads", async () => {
    const note = await encryptNote(USER_ID, NOTE_ID, {
      title: "Source note",
      body: "body",
    });
    const board = sentinelBoard("note");

    const encryptedBoard = await encryptKanbanBoard(
      USER_ID,
      BOARD_ID,
      board,
      note.encryptedWrappedNoteKey
    );
    const encryptedVersion = await encryptKanbanVersion(
      USER_ID,
      VERSION_ID,
      board,
      note.encryptedWrappedNoteKey
    );

    const serialized = JSON.stringify({ encryptedBoard, encryptedVersion });
    expect(serialized).not.toContain(SENTINEL_PHRASE);
    expect(JSON.stringify(encryptedBoard.encryptedBoard.aad)).not.toContain(SENTINEL_PHRASE);
  });

  it("never exposes sentinel plaintext in standalone board payloads", async () => {
    const wrappedBoardKey = await wrapBoardKey(USER_ID, BOARD_ID, await generateBoardKey());
    const encryptedBoard = await encryptKanbanBoard(
      USER_ID,
      BOARD_ID,
      sentinelBoard("standalone"),
      wrappedBoardKey
    );

    const serialized = JSON.stringify(encryptedBoard);
    expect(serialized).not.toContain(SENTINEL_PHRASE);
    expect(JSON.stringify(encryptedBoard.encryptedWrappedKey.aad)).not.toContain(
      SENTINEL_PHRASE
    );
  });
});
