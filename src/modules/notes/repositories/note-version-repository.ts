import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { noteVersions } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export const noteVersionRepository = {
  async create(
    data: {
      id: string;
      noteId: string;
      vaultId: string;
      versionNumber: number;
      encryptedMetadata: EncryptedPayload;
      encryptedBody: EncryptedPayload;
      encryptedWrappedNoteKey: EncryptedPayload;
      bodyEncryptionVersion: string;
    },
    client: DbClient = db
  ) {
    const [version] = await client
      .insert(noteVersions)
      .values({
        id: data.id,
        noteId: data.noteId,
        vaultId: data.vaultId,
        versionNumber: data.versionNumber,
        encryptedMetadata: data.encryptedMetadata,
        encryptedBody: data.encryptedBody,
        encryptedWrappedNoteKey: data.encryptedWrappedNoteKey,
        bodyEncryptionVersion: data.bodyEncryptionVersion,
      })
      .returning();
    return version;
  },

  /** List versions for a note (within a vault), newest first. */
  async findByNoteId(noteId: string, vaultId: string, client: DbClient = db) {
    return client
      .select()
      .from(noteVersions)
      .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.vaultId, vaultId)))
      .orderBy(desc(noteVersions.versionNumber));
  },

  async findByIdForNote(
    versionId: string,
    noteId: string,
    vaultId: string,
    client: DbClient = db
  ) {
    const [version] = await client
      .select()
      .from(noteVersions)
      .where(
        and(
          eq(noteVersions.id, versionId),
          eq(noteVersions.noteId, noteId),
          eq(noteVersions.vaultId, vaultId)
        )
      )
      .limit(1);
    return version ?? null;
  },

  /** Highest version_number currently stored for a note (0 if none). */
  async maxVersionNumber(noteId: string, vaultId: string, client: DbClient = db) {
    const [row] = await client
      .select({ max: sql<number>`coalesce(max(${noteVersions.versionNumber}), 0)` })
      .from(noteVersions)
      .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.vaultId, vaultId)));
    return Number(row?.max ?? 0);
  },

  async countByNoteId(noteId: string, vaultId: string, client: DbClient = db) {
    const rows = await client
      .select({ id: noteVersions.id })
      .from(noteVersions)
      .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.vaultId, vaultId)));
    return rows.length;
  },

  /**
   * Delete the oldest versions so that at most `limit` remain for a note.
   * Operates on row counts / version numbers only — never on plaintext.
   */
  async pruneBeyondLimit(
    noteId: string,
    vaultId: string,
    limit: number,
    client: DbClient = db
  ) {
    const kept = await client
      .select({ versionNumber: noteVersions.versionNumber })
      .from(noteVersions)
      .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.vaultId, vaultId)))
      .orderBy(desc(noteVersions.versionNumber))
      .limit(limit);

    if (kept.length < limit) return 0;
    const cutoff = kept[kept.length - 1]?.versionNumber;
    if (cutoff === undefined) return 0;

    const removed = await client
      .delete(noteVersions)
      .where(
        and(
          eq(noteVersions.noteId, noteId),
          eq(noteVersions.vaultId, vaultId),
          lte(noteVersions.versionNumber, cutoff - 1)
        )
      )
      .returning({ id: noteVersions.id });
    return removed.length;
  },

  /** Ascending helper used by tests / rebuild paths. */
  async findByNoteIdAscending(noteId: string, vaultId: string, client: DbClient = db) {
    return client
      .select()
      .from(noteVersions)
      .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.vaultId, vaultId)))
      .orderBy(asc(noteVersions.versionNumber));
  },
};
