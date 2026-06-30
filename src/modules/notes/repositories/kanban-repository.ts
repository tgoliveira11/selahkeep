import { and, desc, eq, isNull } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { noteKanbanBoards } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export const kanbanRepository = {
  async create(
    data: {
      id: string;
      noteId: string | null;
      vaultId: string;
      encryptedBoard: EncryptedPayload;
      encryptedWrappedKey: EncryptedPayload;
      boardEncryptionVersion: string;
      versionNumber?: number;
    },
    client: DbClient = db
  ) {
    const [board] = await client
      .insert(noteKanbanBoards)
      .values({
        id: data.id,
        noteId: data.noteId,
        vaultId: data.vaultId,
        encryptedBoard: data.encryptedBoard,
        encryptedWrappedKey: data.encryptedWrappedKey,
        boardEncryptionVersion: data.boardEncryptionVersion,
        versionNumber: data.versionNumber ?? 1,
      })
      .returning();
    return board;
  },

  async findByVaultId(
    vaultId: string,
    filters: { noteId?: string; scope?: "standalone" } = {},
    client: DbClient = db
  ) {
    const where = [eq(noteKanbanBoards.vaultId, vaultId)];
    if (filters.noteId) where.push(eq(noteKanbanBoards.noteId, filters.noteId));
    if (filters.scope === "standalone") where.push(isNull(noteKanbanBoards.noteId));

    return client
      .select()
      .from(noteKanbanBoards)
      .where(and(...where))
      .orderBy(desc(noteKanbanBoards.updatedAt));
  },

  async findByIdForVault(boardId: string, vaultId: string, client: DbClient = db) {
    const [board] = await client
      .select()
      .from(noteKanbanBoards)
      .where(and(eq(noteKanbanBoards.id, boardId), eq(noteKanbanBoards.vaultId, vaultId)))
      .limit(1);
    return board ?? null;
  },

  async update(
    boardId: string,
    vaultId: string,
    data: {
      encryptedBoard: EncryptedPayload;
      encryptedWrappedKey: EncryptedPayload;
      boardEncryptionVersion: string;
      versionNumber?: number;
    },
    client: DbClient = db
  ) {
    const [board] = await client
      .update(noteKanbanBoards)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(noteKanbanBoards.id, boardId), eq(noteKanbanBoards.vaultId, vaultId)))
      .returning();
    return board ?? null;
  },

  async delete(boardId: string, vaultId: string, client: DbClient = db) {
    const [board] = await client
      .delete(noteKanbanBoards)
      .where(and(eq(noteKanbanBoards.id, boardId), eq(noteKanbanBoards.vaultId, vaultId)))
      .returning({ id: noteKanbanBoards.id });
    return board ?? null;
  },
};
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { noteKanbanBoards } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export const kanbanRepository = {
  async create(
    data: {
      id: string;
      noteId: string | null;
      vaultId: string;
      encryptedBoard: EncryptedPayload;
      encryptedWrappedKey: EncryptedPayload;
      boardEncryptionVersion: string;
      versionNumber?: number;
    },
    client: DbClient = db
  ) {
    const [board] = await client
      .insert(noteKanbanBoards)
      .values({
        id: data.id,
        noteId: data.noteId,
        vaultId: data.vaultId,
        encryptedBoard: data.encryptedBoard,
        encryptedWrappedKey: data.encryptedWrappedKey,
        boardEncryptionVersion: data.boardEncryptionVersion,
        versionNumber: data.versionNumber ?? 1,
      })
      .returning();
    return board;
  },

  async findByVaultId(vaultId: string, client: DbClient = db) {
    return client
      .select()
      .from(noteKanbanBoards)
      .where(eq(noteKanbanBoards.vaultId, vaultId))
      .orderBy(desc(noteKanbanBoards.updatedAt));
  },

  async findStandaloneByVaultId(vaultId: string, client: DbClient = db) {
    return client
      .select()
      .from(noteKanbanBoards)
      .where(and(eq(noteKanbanBoards.vaultId, vaultId), isNull(noteKanbanBoards.noteId)))
      .orderBy(desc(noteKanbanBoards.updatedAt));
  },

  async findByIdForVault(id: string, vaultId: string, client: DbClient = db) {
    const [board] = await client
      .select()
      .from(noteKanbanBoards)
      .where(and(eq(noteKanbanBoards.id, id), eq(noteKanbanBoards.vaultId, vaultId)))
      .limit(1);
    return board ?? null;
  },

  async findByNoteId(noteId: string, vaultId: string, client: DbClient = db) {
    const [board] = await client
      .select()
      .from(noteKanbanBoards)
      .where(and(eq(noteKanbanBoards.noteId, noteId), eq(noteKanbanBoards.vaultId, vaultId)))
      .limit(1);
    return board ?? null;
  },

  async update(
    id: string,
    vaultId: string,
    data: Partial<{
      encryptedBoard: EncryptedPayload;
      encryptedWrappedKey: EncryptedPayload;
      boardEncryptionVersion: string;
      versionNumber: number;
    }>,
    client: DbClient = db
  ) {
    const [board] = await client
      .update(noteKanbanBoards)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(noteKanbanBoards.id, id), eq(noteKanbanBoards.vaultId, vaultId)))
      .returning();
    return board ?? null;
  },

  async delete(id: string, vaultId: string, client: DbClient = db) {
    const [board] = await client
      .delete(noteKanbanBoards)
      .where(and(eq(noteKanbanBoards.id, id), eq(noteKanbanBoards.vaultId, vaultId)))
      .returning({ id: noteKanbanBoards.id });
    return board ?? null;
  },

  async countByVaultId(vaultId: string, client: DbClient = db) {
    const rows = await client
      .select({ id: noteKanbanBoards.id })
      .from(noteKanbanBoards)
      .where(eq(noteKanbanBoards.vaultId, vaultId));
    return rows.length;
  },
};
