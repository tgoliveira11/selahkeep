import { and, asc, eq, isNull } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { userVaults, vaultEnvelopes } from "@/lib/db/schema";
import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";

export const vaultRepository = {
  async findVaultByUserId(userId: string) {
    const [vault] = await db
      .select()
      .from(userVaults)
      .where(eq(userVaults.userId, userId))
      .limit(1);
    return vault ?? null;
  },

  async createVault(
    userId: string,
    vaultVersion: string,
    client: DbClient = db,
    options?: {
      encryptedVaultSettings?: EncryptedPayload | null;
      encryptedVaultIndex?: EncryptedPayload | null;
    }
  ) {
    const [vault] = await client
      .insert(userVaults)
      .values({
        userId,
        vaultVersion,
        encryptedVaultSettings: options?.encryptedVaultSettings ?? null,
        encryptedVaultIndex: options?.encryptedVaultIndex ?? null,
      })
      .returning();
    return vault;
  },

  async createEnvelope(
    data: {
      userId: string;
      method: string;
      encryptedVaultKey: EncryptedPayload;
      kdfMetadata?: KdfMetadata | null;
      publicMetadata?: Record<string, unknown> | null;
    },
    client: DbClient = db
  ) {
    const [envelope] = await client
      .insert(vaultEnvelopes)
      .values({
        userId: data.userId,
        method: data.method,
        encryptedVaultKey: data.encryptedVaultKey,
        kdfMetadata: data.kdfMetadata ?? null,
        publicMetadata: data.publicMetadata ?? null,
      })
      .returning();
    return envelope;
  },

  async findActiveEnvelopesByUserId(userId: string) {
    return db
      .select()
      .from(vaultEnvelopes)
      .where(and(eq(vaultEnvelopes.userId, userId), isNull(vaultEnvelopes.revokedAt)));
  },

  async findActiveEnvelopeByMethod(userId: string, method: string, client: DbClient = db) {
    const [envelope] = await client
      .select()
      .from(vaultEnvelopes)
      .where(
        and(
          eq(vaultEnvelopes.userId, userId),
          eq(vaultEnvelopes.method, method),
          isNull(vaultEnvelopes.revokedAt)
        )
      )
      .limit(1);
    return envelope ?? null;
  },

  async findEnvelopesByMethod(userId: string, method: string, client: DbClient = db) {
    return client
      .select()
      .from(vaultEnvelopes)
      .where(and(eq(vaultEnvelopes.userId, userId), eq(vaultEnvelopes.method, method)))
      .orderBy(asc(vaultEnvelopes.createdAt));
  },

  async findActivePasskeyEnvelopeByCredentialId(userId: string, credentialId: string) {
    const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
    return (
      envelopes.find((envelope) => {
        if (envelope.method !== "passkey_authorized_device") return false;
        const metadata = envelope.publicMetadata as { credentialId?: string } | null;
        return metadata?.credentialId === credentialId;
      }) ?? null
    );
  },

  async revokeEnvelope(id: string, userId: string, client: DbClient = db) {
    const [envelope] = await client
      .update(vaultEnvelopes)
      .set({ revokedAt: new Date() })
      .where(and(eq(vaultEnvelopes.id, id), eq(vaultEnvelopes.userId, userId)))
      .returning();
    return envelope ?? null;
  },

  async updateVaultIndex(userId: string, encryptedVaultIndex: EncryptedPayload, client: DbClient = db) {
    const [vault] = await client
      .update(userVaults)
      .set({ encryptedVaultIndex, updatedAt: new Date() })
      .where(eq(userVaults.userId, userId))
      .returning();
    return vault ?? null;
  },

  async updateVaultSettings(
    userId: string,
    encryptedVaultSettings: EncryptedPayload,
    client: DbClient = db
  ) {
    const [vault] = await client
      .update(userVaults)
      .set({ encryptedVaultSettings, updatedAt: new Date() })
      .where(eq(userVaults.userId, userId))
      .returning();
    return vault ?? null;
  },
};
