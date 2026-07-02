import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { noteAttachments, notes } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

/** An attachment is owned by exactly one note or one standalone kanban board. */
export type AttachmentOwner =
  | { kind: "note"; id: string }
  | { kind: "board"; id: string };

function ownerColumnMatch(owner: AttachmentOwner): SQL {
  return owner.kind === "note"
    ? eq(noteAttachments.noteId, owner.id)
    : eq(noteAttachments.boardId, owner.id);
}

export const noteAttachmentRepository = {
  async create(data: {
    id: string;
    owner: AttachmentOwner;
    vaultId: string;
    encryptedMetadata: EncryptedPayload;
    encryptedBlob: EncryptedPayload;
    blobEncryptionVersion: string;
    ciphertextBytes: number;
  }) {
    const [row] = await db
      .insert(noteAttachments)
      .values({
        id: data.id,
        noteId: data.owner.kind === "note" ? data.owner.id : null,
        boardId: data.owner.kind === "board" ? data.owner.id : null,
        vaultId: data.vaultId,
        encryptedMetadata: data.encryptedMetadata,
        encryptedBlob: data.encryptedBlob,
        blobEncryptionVersion: data.blobEncryptionVersion,
        ciphertextBytes: data.ciphertextBytes,
      })
      .returning();
    return row;
  },

  async findByOwner(owner: AttachmentOwner, vaultId: string) {
    return db
      .select()
      .from(noteAttachments)
      .where(and(ownerColumnMatch(owner), eq(noteAttachments.vaultId, vaultId)))
      .orderBy(noteAttachments.createdAt);
  },

  async findByIdForOwner(id: string, owner: AttachmentOwner, vaultId: string) {
    const [row] = await db
      .select()
      .from(noteAttachments)
      .where(
        and(eq(noteAttachments.id, id), ownerColumnMatch(owner), eq(noteAttachments.vaultId, vaultId))
      )
      .limit(1);
    return row ?? null;
  },

  async delete(id: string, owner: AttachmentOwner, vaultId: string) {
    const [row] = await db
      .delete(noteAttachments)
      .where(
        and(eq(noteAttachments.id, id), ownerColumnMatch(owner), eq(noteAttachments.vaultId, vaultId))
      )
      .returning({ id: noteAttachments.id });
    return row ?? null;
  },

  async countByOwner(owner: AttachmentOwner, vaultId: string) {
    const rows = await db
      .select({ id: noteAttachments.id })
      .from(noteAttachments)
      .where(and(ownerColumnMatch(owner), eq(noteAttachments.vaultId, vaultId)));
    return rows.length;
  },

  async sumCiphertextBytesByVaultId(vaultId: string): Promise<number> {
    const [row] = await db
      .select({
        total: sql<number>`coalesce(sum(${noteAttachments.ciphertextBytes}), 0)::int`,
      })
      .from(noteAttachments)
      .where(eq(noteAttachments.vaultId, vaultId));
    return row?.total ?? 0;
  },
};

export async function sumNoteCiphertextBytesByVaultId(vaultId: string): Promise<number> {
  const rows = await db
    .select({
      encryptedMetadata: notes.encryptedMetadata,
      encryptedBody: notes.encryptedBody,
      encryptedWrappedNoteKey: notes.encryptedWrappedNoteKey,
    })
    .from(notes)
    .where(and(eq(notes.vaultId, vaultId), sql`${notes.deletedAt} IS NULL`));

  let total = 0;
  for (const row of rows) {
    total += JSON.stringify(row.encryptedMetadata).length;
    total += JSON.stringify(row.encryptedBody).length;
    total += JSON.stringify(row.encryptedWrappedNoteKey).length;
  }
  return total;
}
