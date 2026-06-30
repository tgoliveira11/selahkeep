import { describe, it, expect, beforeEach } from "vitest";
import { encryptNote } from "@/lib/crypto-client/notes";
import { encryptKanbanVersion } from "@/lib/crypto-client/kanban";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { SENTINEL_PHRASE } from "./sentinel-phrase.test";
import { KANBAN_VERSION_ID, NOTE_ID, USER_ID } from "@/test/helpers/fixtures";

const BOARD_ID = "550e8400-e29b-41d4-a716-446655440010";

describe("sentinel phrase kanban version snapshots", () => {
  beforeEach(async () => {
    setSessionVaultKey(await generateUserVaultKey());
  });

  it("never exposes sentinel plaintext in encrypted version payloads", async () => {
    const note = await encryptNote(USER_ID, NOTE_ID, {
      title: "Source note",
      body: "body",
    });
    const board: KanbanBoardPlaintext = {
      schemaVersion: 1,
      boardId: BOARD_ID,
      scope: "note",
      noteId: NOTE_ID,
      title: SENTINEL_PHRASE,
      columns: [{ id: "todo", title: "To Do", order: 0, isDoneColumn: false }],
      cards: [
        {
          id: "card-1",
          columnId: "todo",
          title: SENTINEL_PHRASE,
          description: SENTINEL_PHRASE,
          order: 0,
          dueDate: null,
          priority: null,
          labelIds: [],
          createdAt: "2026-06-30T12:00:00.000Z",
          updatedAt: "2026-06-30T12:00:00.000Z",
          source: { kind: "manual", key: "manual:card-1" },
        },
      ],
      labels: [],
      generatedFrom: null,
      createdAt: "2026-06-30T12:00:00.000Z",
      updatedAt: "2026-06-30T12:00:00.000Z",
    };

    const version = await encryptKanbanVersion(
      USER_ID,
      KANBAN_VERSION_ID,
      board,
      note.encryptedWrappedNoteKey
    );

    const serialized = JSON.stringify(version);
    expect(serialized).not.toContain(SENTINEL_PHRASE);
    expect(JSON.stringify(version.encryptedBoard.aad)).not.toContain(SENTINEL_PHRASE);
  });
});
