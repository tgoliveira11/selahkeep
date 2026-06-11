import { and, eq, gt, isNull, ne, desc } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { accountSessions } from "@/lib/db/schema";

export const accountSessionRepository = {
  async create(
    data: {
      userId: string;
      authMethod: string;
      browser?: string | null;
      platform?: string | null;
      deviceType?: string | null;
      ipHash?: string | null;
      ipMasked?: string | null;
      userAgentHash?: string | null;
      expiresAt: Date;
    },
    client: DbClient = db
  ) {
    const now = new Date();
    const [row] = await client
      .insert(accountSessions)
      .values({
        userId: data.userId,
        authMethod: data.authMethod,
        browser: data.browser ?? null,
        platform: data.platform ?? null,
        deviceType: data.deviceType ?? null,
        ipHash: data.ipHash ?? null,
        ipMasked: data.ipMasked ?? null,
        userAgentHash: data.userAgentHash ?? null,
        expiresAt: data.expiresAt,
        createdAt: now,
        lastUsedAt: now,
      })
      .returning();
    return row;
  },

  async findByIdForUser(sessionId: string, userId: string) {
    const [row] = await db
      .select()
      .from(accountSessions)
      .where(and(eq(accountSessions.id, sessionId), eq(accountSessions.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async findActiveByUserId(userId: string) {
    const now = new Date();
    return db
      .select()
      .from(accountSessions)
      .where(
        and(
          eq(accountSessions.userId, userId),
          isNull(accountSessions.revokedAt),
          gt(accountSessions.expiresAt, now)
        )
      )
      .orderBy(desc(accountSessions.lastUsedAt));
  },

  async isActive(sessionId: string, userId: string) {
    const row = await accountSessionRepository.findByIdForUser(sessionId, userId);
    if (!row || row.revokedAt) return false;
    return row.expiresAt.getTime() > Date.now();
  },

  async revokeById(sessionId: string, userId: string, client: DbClient = db) {
    const now = new Date();
    const [row] = await client
      .update(accountSessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(accountSessions.id, sessionId),
          eq(accountSessions.userId, userId),
          isNull(accountSessions.revokedAt)
        )
      )
      .returning();
    return row ?? null;
  },

  async revokeAllExcept(userId: string, keepSessionId: string, client: DbClient = db) {
    const now = new Date();
    return client
      .update(accountSessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(accountSessions.userId, userId),
          ne(accountSessions.id, keepSessionId),
          isNull(accountSessions.revokedAt)
        )
      )
      .returning();
  },

  async revokeAllForUser(userId: string, client: DbClient = db) {
    const now = new Date();
    return client
      .update(accountSessions)
      .set({ revokedAt: now })
      .where(and(eq(accountSessions.userId, userId), isNull(accountSessions.revokedAt)))
      .returning();
  },

  async touchLastUsed(sessionId: string, userId: string, client: DbClient = db) {
    const now = new Date();
    const [row] = await client
      .update(accountSessions)
      .set({ lastUsedAt: now })
      .where(
        and(
          eq(accountSessions.id, sessionId),
          eq(accountSessions.userId, userId),
          isNull(accountSessions.revokedAt),
          gt(accountSessions.expiresAt, now)
        )
      )
      .returning();
    return row ?? null;
  },

  async updateMetadata(
    sessionId: string,
    userId: string,
    data: {
      browser?: string;
      platform?: string;
      deviceType?: string;
      ipHash?: string;
      ipMasked?: string;
      userAgentHash?: string;
    },
    client: DbClient = db
  ) {
    const [row] = await client
      .update(accountSessions)
      .set(data)
      .where(
        and(
          eq(accountSessions.id, sessionId),
          eq(accountSessions.userId, userId),
          isNull(accountSessions.revokedAt)
        )
      )
      .returning();
    return row ?? null;
  },
};
