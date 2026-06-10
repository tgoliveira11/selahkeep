import { sql } from "drizzle-orm";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { passkeyCredentials, webauthnChallenges } from "@/lib/db/schema";

export class ChallengeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChallengeValidationError";
  }
}

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

  async deleteExpiredChallenges(client: DbClient = db) {
    await client.delete(webauthnChallenges).where(sql`${webauthnChallenges.expiresAt} < ${new Date()}`);
  },

  async storeChallenge(
    data: {
      userId?: string;
      challenge: string;
      type: string;
      expiresAt: Date;
    },
    client: DbClient = db
  ) {
    await passkeyRepository.deleteExpiredChallenges(client);
    const [row] = await client
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

  /** @deprecated Prefer consumeValidChallenge for one-time challenge use. */
  async findValidChallenge(challenge: string, type: string, expectedUserId?: string) {
    const [row] = await db
      .select()
      .from(webauthnChallenges)
      .where(
        and(eq(webauthnChallenges.challenge, challenge), eq(webauthnChallenges.type, type))
      )
      .limit(1);

    if (!row || row.expiresAt < new Date()) return null;

    if (expectedUserId !== undefined) {
      if (row.userId !== expectedUserId) return null;
    }

    return row;
  },

  async consumeValidChallenge(
    challenge: string,
    type: string,
    expectedUserId?: string,
    client: DbClient = db
  ) {
    const now = new Date();
    const userCondition =
      expectedUserId === undefined
        ? sql`true`
        : eq(webauthnChallenges.userId, expectedUserId);

    const [row] = await client
      .delete(webauthnChallenges)
      .where(
        and(
          eq(webauthnChallenges.challenge, challenge),
          eq(webauthnChallenges.type, type),
          gt(webauthnChallenges.expiresAt, now),
          userCondition
        )
      )
      .returning();

    if (!row) {
      throw new ChallengeValidationError("Invalid or expired challenge");
    }

    return row;
  },

  async deleteChallenge(id: string, client: DbClient = db) {
    await client.delete(webauthnChallenges).where(eq(webauthnChallenges.id, id));
  },
};
