import { and, eq, isNull, gt } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import {
  userTwoFactorBackupCodes,
  userTwoFactorLoginChallenges,
  userTwoFactorLoginTokens,
  userTwoFactorSessionUpgrades,
  userTwoFactorSettings,
} from "@/lib/db/schema";
import type { EncryptedTwoFactorSecret } from "@/server/policies/two-factor-secret-crypto";

export const twoFactorRepository = {
  async findSettingsByUserId(userId: string) {
    const [row] = await db
      .select()
      .from(userTwoFactorSettings)
      .where(eq(userTwoFactorSettings.userId, userId))
      .limit(1);
    return row ?? null;
  },

  async upsertSettings(
    userId: string,
    data: Partial<{
      enabled: boolean;
      secretEncrypted: EncryptedTwoFactorSecret | null;
      pendingSecretEncrypted: EncryptedTwoFactorSecret | null;
      enabledAt: Date | null;
    }>,
    client: DbClient = db
  ) {
    const existing = await twoFactorRepository.findSettingsByUserId(userId);
    if (!existing) {
      const [row] = await client
        .insert(userTwoFactorSettings)
        .values({
          userId,
          enabled: data.enabled ?? false,
          secretEncrypted: data.secretEncrypted ?? null,
          pendingSecretEncrypted: data.pendingSecretEncrypted ?? null,
          enabledAt: data.enabledAt ?? null,
        })
        .returning();
      return row;
    }

    const [row] = await client
      .update(userTwoFactorSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userTwoFactorSettings.userId, userId))
      .returning();
    return row;
  },

  async replaceBackupCodes(
    userId: string,
    codeHashes: string[],
    client: DbClient = db
  ) {
    await client
      .delete(userTwoFactorBackupCodes)
      .where(eq(userTwoFactorBackupCodes.userId, userId));
    if (codeHashes.length === 0) return [];
    return client
      .insert(userTwoFactorBackupCodes)
      .values(codeHashes.map((codeHash) => ({ userId, codeHash })))
      .returning();
  },

  async findUnusedBackupCodeByHash(userId: string, codeHash: string) {
    const [row] = await db
      .select()
      .from(userTwoFactorBackupCodes)
      .where(
        and(
          eq(userTwoFactorBackupCodes.userId, userId),
          eq(userTwoFactorBackupCodes.codeHash, codeHash),
          isNull(userTwoFactorBackupCodes.usedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  async markBackupCodeUsed(id: string, userId: string, client: DbClient = db) {
    const [row] = await client
      .update(userTwoFactorBackupCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(userTwoFactorBackupCodes.id, id),
          eq(userTwoFactorBackupCodes.userId, userId),
          isNull(userTwoFactorBackupCodes.usedAt)
        )
      )
      .returning();
    return row ?? null;
  },

  async createLoginChallenge(
    data: {
      userId: string;
      challengeTokenHash: string;
      authProvider: string;
      expiresAt: Date;
    },
    client: DbClient = db
  ) {
    const [row] = await client.insert(userTwoFactorLoginChallenges).values(data).returning();
    return row;
  },

  async consumeLoginChallenge(challengeTokenHash: string, client: DbClient = db) {
    const now = new Date();
    const [row] = await client
      .update(userTwoFactorLoginChallenges)
      .set({ consumedAt: now })
      .where(
        and(
          eq(userTwoFactorLoginChallenges.challengeTokenHash, challengeTokenHash),
          isNull(userTwoFactorLoginChallenges.consumedAt),
          gt(userTwoFactorLoginChallenges.expiresAt, now)
        )
      )
      .returning();
    return row ?? null;
  },

  async createLoginToken(
    data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      authMethod?: string | null;
    },
    client: DbClient = db
  ) {
    const [row] = await client.insert(userTwoFactorLoginTokens).values(data).returning();
    return row;
  },

  async findValidLoginToken(tokenHash: string) {
    const now = new Date();
    const [row] = await db
      .select()
      .from(userTwoFactorLoginTokens)
      .where(
        and(
          eq(userTwoFactorLoginTokens.tokenHash, tokenHash),
          isNull(userTwoFactorLoginTokens.consumedAt),
          gt(userTwoFactorLoginTokens.expiresAt, now)
        )
      )
      .limit(1);
    return row ?? null;
  },

  async consumeLoginToken(tokenHash: string, client: DbClient = db) {
    const now = new Date();
    const [row] = await client
      .update(userTwoFactorLoginTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(userTwoFactorLoginTokens.tokenHash, tokenHash),
          isNull(userTwoFactorLoginTokens.consumedAt),
          gt(userTwoFactorLoginTokens.expiresAt, now)
        )
      )
      .returning();
    return row ?? null;
  },

  async createSessionUpgrade(
    data: { userId: string; tokenHash: string; expiresAt: Date },
    client: DbClient = db
  ) {
    const [row] = await client.insert(userTwoFactorSessionUpgrades).values(data).returning();
    return row;
  },

  async consumeSessionUpgrade(tokenHash: string, userId: string, client: DbClient = db) {
    const now = new Date();
    const [row] = await client
      .update(userTwoFactorSessionUpgrades)
      .set({ consumedAt: now })
      .where(
        and(
          eq(userTwoFactorSessionUpgrades.tokenHash, tokenHash),
          eq(userTwoFactorSessionUpgrades.userId, userId),
          isNull(userTwoFactorSessionUpgrades.consumedAt),
          gt(userTwoFactorSessionUpgrades.expiresAt, now)
        )
      )
      .returning();
    return row ?? null;
  },

  async deleteSettingsForUser(userId: string, client: DbClient = db) {
    await client
      .delete(userTwoFactorBackupCodes)
      .where(eq(userTwoFactorBackupCodes.userId, userId));
    await client
      .delete(userTwoFactorSettings)
      .where(eq(userTwoFactorSettings.userId, userId));
  },
};
