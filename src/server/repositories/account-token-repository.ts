import { and, eq, isNull, lt, gt } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { accountTokens } from "@/lib/db/schema";

export type AccountTokenType = "email_verification" | "password_reset";

export const accountTokenRepository = {
  async create(
    data: {
      userId?: string | null;
      email?: string | null;
      type: AccountTokenType;
      tokenHash: string;
      expiresAt: Date;
    },
    client: DbClient = db
  ) {
    const [row] = await client.insert(accountTokens).values(data).returning();
    return row;
  },

  async consumeValidToken(tokenHash: string, type: AccountTokenType, client: DbClient = db) {
    const now = new Date();
    const [row] = await client
      .update(accountTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(accountTokens.tokenHash, tokenHash),
          eq(accountTokens.type, type),
          isNull(accountTokens.consumedAt),
          gt(accountTokens.expiresAt, now)
        )
      )
      .returning();
    return row ?? null;
  },

  async findValidToken(tokenHash: string, type: AccountTokenType) {
    const now = new Date();
    const [row] = await db
      .select()
      .from(accountTokens)
      .where(
        and(
          eq(accountTokens.tokenHash, tokenHash),
          eq(accountTokens.type, type),
          isNull(accountTokens.consumedAt),
          gt(accountTokens.expiresAt, now)
        )
      )
      .limit(1);
    return row ?? null;
  },

  async deleteExpiredAndConsumed(client: DbClient = db) {
    const now = new Date();
    await client
      .delete(accountTokens)
      .where(
        and(
          lt(accountTokens.expiresAt, now),
          isNull(accountTokens.consumedAt)
        )
      );
  },

  async revokeActiveTokensForUser(
    userId: string,
    type: AccountTokenType,
    client: DbClient = db
  ) {
    const now = new Date();
    await client
      .update(accountTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(accountTokens.userId, userId),
          eq(accountTokens.type, type),
          isNull(accountTokens.consumedAt),
          gt(accountTokens.expiresAt, now)
        )
      );
  },
};
