import { and, eq, isNull } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { passkeyCredentials, webauthnChallenges } from "@/lib/db/schema";

export const passkeyRepository = {
  async createCredential(
    data: {
      userId: string;
      credentialId: string;
      publicKey: string;
      counter: string;
      transports?: string[] | null;
    },
    client: DbClient = db
  ) {
    const [cred] = await client
      .insert(passkeyCredentials)
      .values({
        userId: data.userId,
        credentialId: data.credentialId,
        publicKey: data.publicKey,
        counter: data.counter,
        transports: data.transports ?? null,
      })
      .returning();
    return cred;
  },

  async findByCredentialId(credentialId: string) {
    const [cred] = await db
      .select()
      .from(passkeyCredentials)
      .where(
        and(eq(passkeyCredentials.credentialId, credentialId), isNull(passkeyCredentials.revokedAt))
      )
      .limit(1);
    return cred ?? null;
  },

  async findByUserId(userId: string) {
    return db
      .select()
      .from(passkeyCredentials)
      .where(and(eq(passkeyCredentials.userId, userId), isNull(passkeyCredentials.revokedAt)));
  },

  async updateCounter(credentialId: string, counter: string) {
    await db
      .update(passkeyCredentials)
      .set({ counter })
      .where(eq(passkeyCredentials.credentialId, credentialId));
  },

  async revoke(id: string, userId: string) {
    const [cred] = await db
      .update(passkeyCredentials)
      .set({ revokedAt: new Date() })
      .where(and(eq(passkeyCredentials.id, id), eq(passkeyCredentials.userId, userId)))
      .returning();
    return cred ?? null;
  },

  async revokeAllByUserId(userId: string, client: DbClient = db) {
    return client
      .update(passkeyCredentials)
      .set({ revokedAt: new Date() })
      .where(and(eq(passkeyCredentials.userId, userId), isNull(passkeyCredentials.revokedAt)))
      .returning({ id: passkeyCredentials.id });
  },

  async storeChallenge(data: {
    userId?: string;
    challenge: string;
    type: string;
    expiresAt: Date;
  }) {
    const [row] = await db
      .insert(webauthnChallenges)
      .values({
        userId: data.userId ?? null,
        challenge: data.challenge,
        type: data.type,
        expiresAt: data.expiresAt,
      })
      .returning();
    return row;
  },

  async findValidChallenge(challenge: string, type: string) {
    const [row] = await db
      .select()
      .from(webauthnChallenges)
      .where(
        and(eq(webauthnChallenges.challenge, challenge), eq(webauthnChallenges.type, type))
      )
      .limit(1);
    if (!row || row.expiresAt < new Date()) return null;
    return row;
  },

  async deleteChallenge(id: string) {
    await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, id));
  },
};
