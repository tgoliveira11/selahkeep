import { and, desc, eq, isNull } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export const noteRepository = {
  async create(
    data: {
      id: string;
      vaultId: string;
      encryptedMetadata: EncryptedPayload;
      encryptedBody: EncryptedPayload;
      encryptedWrappedNoteKey: EncryptedPayload;
      bodyEncryptionVersion: string;
    },
    client: DbClient = db
  ) {
    const [note] = await client
      .insert(notes)
      .values({
        id: data.id,
        vaultId: data.vaultId,
        encryptedMetadata: data.encryptedMetadata,
        encryptedBody: data.encryptedBody,
        encryptedWrappedNoteKey: data.encryptedWrappedNoteKey,
        bodyEncryptionVersion: data.bodyEncryptionVersion,
      })
      .returning();
    return note;
  },

  async findByVaultId(vaultId: string) {
    return db
      .select()
      .from(notes)
      .where(and(eq(notes.vaultId, vaultId), isNull(notes.deletedAt)))
      .orderBy(desc(notes.createdAt));
  },

  async findByIdForVault(id: string, vaultId: string) {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.vaultId, vaultId), isNull(notes.deletedAt)))
      .limit(1);
    return note ?? null;
  },

  async update(
    id: string,
    vaultId: string,
    data: Partial<{
      encryptedMetadata: EncryptedPayload;
      encryptedBody: EncryptedPayload;
      encryptedWrappedNoteKey: EncryptedPayload;
      bodyEncryptionVersion: string;
    }>
  ) {
    const [note] = await db
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.vaultId, vaultId), isNull(notes.deletedAt)))
      .returning();
    return note ?? null;
  },

  async softDelete(id: string, vaultId: string) {
    const [note] = await db
      .update(notes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.vaultId, vaultId), isNull(notes.deletedAt)))
      .returning({ id: notes.id });
    return note ?? null;
  },
};
