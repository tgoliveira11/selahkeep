import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { letters } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export const letterRepository = {
  async create(data: {
    userId: string;
    encryptedTitle: EncryptedPayload;
    encryptedBody: EncryptedPayload;
    encryptedLetterKey: EncryptedPayload;
    encryptionVersion: string;
    answered?: boolean;
  }) {
    const [letter] = await db
      .insert(letters)
      .values({
        userId: data.userId,
        encryptedTitle: data.encryptedTitle,
        encryptedBody: data.encryptedBody,
        encryptedLetterKey: data.encryptedLetterKey,
        encryptionVersion: data.encryptionVersion,
        answered: data.answered ?? false,
      })
      .returning();
    return letter;
  },

  async findByUserId(userId: string) {
    return db
      .select()
      .from(letters)
      .where(eq(letters.userId, userId))
      .orderBy(desc(letters.createdAt));
  },

  async findByIdForUser(id: string, userId: string) {
    const [letter] = await db
      .select()
      .from(letters)
      .where(and(eq(letters.id, id), eq(letters.userId, userId)))
      .limit(1);
    return letter ?? null;
  },

  async update(
    id: string,
    userId: string,
    data: Partial<{
      encryptedTitle: EncryptedPayload;
      encryptedBody: EncryptedPayload;
      encryptedLetterKey: EncryptedPayload;
      encryptionVersion: string;
      answered: boolean;
      answeredAt: Date | null;
    }>
  ) {
    const [letter] = await db
      .update(letters)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(letters.id, id), eq(letters.userId, userId)))
      .returning();
    return letter ?? null;
  },

  async delete(id: string, userId: string) {
    const result = await db
      .delete(letters)
      .where(and(eq(letters.id, id), eq(letters.userId, userId)))
      .returning({ id: letters.id });
    return result.length > 0;
  },

  async countByUserId(userId: string) {
    const rows = await db
      .select({ id: letters.id })
      .from(letters)
      .where(eq(letters.userId, userId));
    return rows.length;
  },
};
