import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { noteKanbanVersions } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export const kanbanVersionRepository = {
  async create(
    data: {
      id: string;
      boardId: string;
      noteId: string | null;
      vaultId: string;
      versionNumber: number;
      encryptedBoard: EncryptedPayload;
      encryptedWrappedKey: EncryptedPayload;
      boardEncryptionVersion: string;
    },
    client: DbClient = db
  ) {
    const [version] = await client
      .insert(noteKanbanVersions)
      .values({
        id: data.id,
        boardId: data.boardId,
        noteId: data.noteId,
        vaultId: data.vaultId,
        versionNumber: data.versionNumber,
        encryptedBoard: data.encryptedBoard,
        encryptedWrappedKey: data.encryptedWrappedKey,
        boardEncryptionVersion: data.boardEncryptionVersion,
      })
      .returning();
    return version;
  },

  async findByBoardId(boardId: string, vaultId: string, client: DbClient = db) {
    return client
      .select()
      .from(noteKanbanVersions)
      .where(and(eq(noteKanbanVersions.boardId, boardId), eq(noteKanbanVersions.vaultId, vaultId)))
      .orderBy(desc(noteKanbanVersions.versionNumber));
  },

  async findByIdForBoard(
    versionId: string,
    boardId: string,
    vaultId: string,
    client: DbClient = db
  ) {
    const [version] = await client
      .select()
      .from(noteKanbanVersions)
      .where(
        and(
          eq(noteKanbanVersions.id, versionId),
          eq(noteKanbanVersions.boardId, boardId),
          eq(noteKanbanVersions.vaultId, vaultId)
        )
      )
      .limit(1);
    return version ?? null;
  },

  async maxVersionNumber(boardId: string, vaultId: string, client: DbClient = db) {
    const [row] = await client
      .select({ max: sql<number>`coalesce(max(${noteKanbanVersions.versionNumber}), 0)` })
      .from(noteKanbanVersions)
      .where(and(eq(noteKanbanVersions.boardId, boardId), eq(noteKanbanVersions.vaultId, vaultId)));
    return Number(row?.max ?? 0);
  },

  async pruneBeyondLimit(boardId: string, vaultId: string, limit: number, client: DbClient = db) {
    const kept = await client
      .select({ versionNumber: noteKanbanVersions.versionNumber })
      .from(noteKanbanVersions)
      .where(and(eq(noteKanbanVersions.boardId, boardId), eq(noteKanbanVersions.vaultId, vaultId)))
      .orderBy(desc(noteKanbanVersions.versionNumber))
      .limit(limit);

    if (kept.length < limit) return 0;
    const cutoff = kept[kept.length - 1]?.versionNumber;
    if (cutoff === undefined) return 0;

    const removed = await client
      .delete(noteKanbanVersions)
      .where(
        and(
          eq(noteKanbanVersions.boardId, boardId),
          eq(noteKanbanVersions.vaultId, vaultId),
          lte(noteKanbanVersions.versionNumber, cutoff - 1)
        )
      )
      .returning({ id: noteKanbanVersions.id });
    return removed.length;
  },
};
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { noteKanbanVersions } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export const kanbanVersionRepository = {
  async create(
    data: {
      id: string;
      boardId: string;
      noteId: string | null;
      vaultId: string;
      versionNumber: number;
      encryptedBoard: EncryptedPayload;
      encryptedWrappedKey: EncryptedPayload;
      boardEncryptionVersion: string;
    },
    client: DbClient = db
  ) {
    const [version] = await client
      .insert(noteKanbanVersions)
      .values({
        id: data.id,
        boardId: data.boardId,
        noteId: data.noteId,
        vaultId: data.vaultId,
        versionNumber: data.versionNumber,
        encryptedBoard: data.encryptedBoard,
        encryptedWrappedKey: data.encryptedWrappedKey,
        boardEncryptionVersion: data.boardEncryptionVersion,
      })
      .returning();
    return version;
  },

  /** List versions for a board (within a vault), newest first. */
  async findByBoardId(boardId: string, vaultId: string, client: DbClient = db) {
    return client
      .select()
      .from(noteKanbanVersions)
      .where(and(eq(noteKanbanVersions.boardId, boardId), eq(noteKanbanVersions.vaultId, vaultId)))
      .orderBy(desc(noteKanbanVersions.versionNumber));
  },

  async findByIdForBoard(
    versionId: string,
    boardId: string,
    vaultId: string,
    client: DbClient = db
  ) {
    const [version] = await client
      .select()
      .from(noteKanbanVersions)
      .where(
        and(
          eq(noteKanbanVersions.id, versionId),
          eq(noteKanbanVersions.boardId, boardId),
          eq(noteKanbanVersions.vaultId, vaultId)
        )
      )
      .limit(1);
    return version ?? null;
  },

  /** Highest version_number currently stored for a board (0 if none). */
  async maxVersionNumber(boardId: string, vaultId: string, client: DbClient = db) {
    const [row] = await client
      .select({ max: sql<number>`coalesce(max(${noteKanbanVersions.versionNumber}), 0)` })
      .from(noteKanbanVersions)
      .where(and(eq(noteKanbanVersions.boardId, boardId), eq(noteKanbanVersions.vaultId, vaultId)));
    return Number(row?.max ?? 0);
  },

  async countByBoardId(boardId: string, vaultId: string, client: DbClient = db) {
    const rows = await client
      .select({ id: noteKanbanVersions.id })
      .from(noteKanbanVersions)
      .where(and(eq(noteKanbanVersions.boardId, boardId), eq(noteKanbanVersions.vaultId, vaultId)));
    return rows.length;
  },

  /**
   * Delete the oldest versions so that at most `limit` remain for a board.
   * Operates on row counts / version numbers only — never on plaintext.
   */
  async pruneBeyondLimit(
    boardId: string,
    vaultId: string,
    limit: number,
    client: DbClient = db
  ) {
    const kept = await client
      .select({ versionNumber: noteKanbanVersions.versionNumber })
      .from(noteKanbanVersions)
      .where(and(eq(noteKanbanVersions.boardId, boardId), eq(noteKanbanVersions.vaultId, vaultId)))
      .orderBy(desc(noteKanbanVersions.versionNumber))
      .limit(limit);

    if (kept.length < limit) return 0;
    const cutoff = kept[kept.length - 1]?.versionNumber;
    if (cutoff === undefined) return 0;

    const removed = await client
      .delete(noteKanbanVersions)
      .where(
        and(
          eq(noteKanbanVersions.boardId, boardId),
          eq(noteKanbanVersions.vaultId, vaultId),
          lte(noteKanbanVersions.versionNumber, cutoff - 1)
        )
      )
      .returning({ id: noteKanbanVersions.id });
    return removed.length;
  },

  /** Ascending helper used by tests / rebuild paths. */
  async findByBoardIdAscending(boardId: string, vaultId: string, client: DbClient = db) {
    return client
      .select()
      .from(noteKanbanVersions)
      .where(and(eq(noteKanbanVersions.boardId, boardId), eq(noteKanbanVersions.vaultId, vaultId)))
      .orderBy(asc(noteKanbanVersions.versionNumber));
  },
};
