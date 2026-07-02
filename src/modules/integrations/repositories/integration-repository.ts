import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { integrationGrants, integrationTokens, integrations } from "@/lib/db/schema";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export const integrationRepository = {
  async createIntegration(
    data: { userId: string; name: string; type: string },
    client: DbClient = db
  ) {
    const [row] = await client
      .insert(integrations)
      .values({
        userId: data.userId,
        name: data.name,
        type: data.type,
      })
      .returning();
    return row;
  },

  async createToken(
    data: {
      integrationId: string;
      tokenHash: string;
      tokenPrefix: string;
      expiresAt?: Date | null;
    },
    client: DbClient = db
  ) {
    const [row] = await client
      .insert(integrationTokens)
      .values({
        integrationId: data.integrationId,
        tokenHash: data.tokenHash,
        tokenPrefix: data.tokenPrefix,
        expiresAt: data.expiresAt ?? null,
      })
      .returning();
    return row;
  },

  async findByIdForUser(id: string, userId: string) {
    const [row] = await db
      .select()
      .from(integrations)
      .where(
        and(eq(integrations.id, id), eq(integrations.userId, userId), isNull(integrations.revokedAt))
      )
      .limit(1);
    return row ?? null;
  },

  async listByUserId(userId: string) {
    return db
      .select({
        id: integrations.id,
        name: integrations.name,
        type: integrations.type,
        createdAt: integrations.createdAt,
        tokenPrefix: integrationTokens.tokenPrefix,
        lastUsedAt: integrationTokens.lastUsedAt,
      })
      .from(integrations)
      .leftJoin(
        integrationTokens,
        and(
          eq(integrationTokens.integrationId, integrations.id),
          isNull(integrationTokens.revokedAt)
        )
      )
      .where(and(eq(integrations.userId, userId), isNull(integrations.revokedAt)))
      .orderBy(desc(integrations.createdAt));
  },

  async revokeIntegration(id: string, userId: string, client: DbClient = db) {
    const now = new Date();
    const [row] = await client
      .update(integrations)
      .set({ revokedAt: now })
      .where(and(eq(integrations.id, id), eq(integrations.userId, userId), isNull(integrations.revokedAt)))
      .returning();
    if (!row) return null;
    await client
      .update(integrationTokens)
      .set({ revokedAt: now })
      .where(and(eq(integrationTokens.integrationId, id), isNull(integrationTokens.revokedAt)));
    await client
      .update(integrationGrants)
      .set({ revokedAt: now })
      .where(and(eq(integrationGrants.integrationId, id), isNull(integrationGrants.revokedAt)));
    return row;
  },

  async findByTokenHash(tokenHash: string) {
    const [row] = await db
      .select({
        integrationId: integrations.id,
        userId: integrations.userId,
        tokenId: integrationTokens.id,
        expiresAt: integrationTokens.expiresAt,
      })
      .from(integrationTokens)
      .innerJoin(integrations, eq(integrations.id, integrationTokens.integrationId))
      .where(
        and(
          eq(integrationTokens.tokenHash, tokenHash),
          isNull(integrationTokens.revokedAt),
          isNull(integrations.revokedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  async touchTokenLastUsed(tokenId: string) {
    await db
      .update(integrationTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(integrationTokens.id, tokenId));
  },

  async upsertGrant(
    data: {
      integrationId: string;
      resourceType: string;
      resourceId: string;
      permissions: string;
      encryptedWrappedKey: EncryptedPayload;
    },
    client: DbClient = db
  ) {
    const now = new Date();
    await client
      .update(integrationGrants)
      .set({ revokedAt: now })
      .where(
        and(
          eq(integrationGrants.integrationId, data.integrationId),
          eq(integrationGrants.resourceType, data.resourceType),
          eq(integrationGrants.resourceId, data.resourceId),
          isNull(integrationGrants.revokedAt)
        )
      );

    const [row] = await client
      .insert(integrationGrants)
      .values({
        integrationId: data.integrationId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        permissions: data.permissions,
        encryptedWrappedKey: data.encryptedWrappedKey,
      })
      .returning();
    return row;
  },

  async listGrants(integrationId: string) {
    return db
      .select({
        id: integrationGrants.id,
        resourceType: integrationGrants.resourceType,
        resourceId: integrationGrants.resourceId,
        permissions: integrationGrants.permissions,
        encryptedWrappedKey: integrationGrants.encryptedWrappedKey,
        createdAt: integrationGrants.createdAt,
      })
      .from(integrationGrants)
      .where(and(eq(integrationGrants.integrationId, integrationId), isNull(integrationGrants.revokedAt)));
  },

  async findGrant(integrationId: string, resourceType: string, resourceId: string) {
    const [row] = await db
      .select()
      .from(integrationGrants)
      .where(
        and(
          eq(integrationGrants.integrationId, integrationId),
          eq(integrationGrants.resourceType, resourceType),
          eq(integrationGrants.resourceId, resourceId),
          isNull(integrationGrants.revokedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  async listGrantedResourceIds(integrationId: string, resourceType: string) {
    const rows = await db
      .select({ resourceId: integrationGrants.resourceId })
      .from(integrationGrants)
      .where(
        and(
          eq(integrationGrants.integrationId, integrationId),
          eq(integrationGrants.resourceType, resourceType),
          isNull(integrationGrants.revokedAt)
        )
      );
    return rows.map((r) => r.resourceId);
  },
};
