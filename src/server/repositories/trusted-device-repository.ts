import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db, type DbClient } from "@/lib/db";
import { trustedDevices } from "@/lib/db/schema";

const MAX_TRUSTED_DEVICES = parseInt(process.env.MAX_TRUSTED_DEVICES ?? "50", 10);

export const trustedDeviceRepository = {
  maxDevices: MAX_TRUSTED_DEVICES,

  async findByUserId(userId: string) {
    return db
      .select()
      .from(trustedDevices)
      .where(eq(trustedDevices.userId, userId))
      .orderBy(trustedDevices.createdAt);
  },

  async findActiveByUserId(userId: string) {
    return db
      .select()
      .from(trustedDevices)
      .where(and(eq(trustedDevices.userId, userId), isNull(trustedDevices.revokedAt)));
  },

  async findByIdForUser(id: string, userId: string) {
    const [device] = await db
      .select()
      .from(trustedDevices)
      .where(and(eq(trustedDevices.id, id), eq(trustedDevices.userId, userId)))
      .limit(1);
    return device ?? null;
  },

  async countActiveByUserId(userId: string) {
    const rows = await db
      .select({ id: trustedDevices.id })
      .from(trustedDevices)
      .where(and(eq(trustedDevices.userId, userId), isNull(trustedDevices.revokedAt)));
    return rows.length;
  },

  clientDeviceMatch(userId: string, clientDeviceId: string) {
    return and(
      eq(trustedDevices.userId, userId),
      or(
        eq(trustedDevices.clientDeviceId, clientDeviceId),
        sql`${trustedDevices.devicePublicKey}->>'deviceId' = ${clientDeviceId}`
      )
    );
  },

  async findActiveByClientDeviceId(userId: string, clientDeviceId: string) {
    const [device] = await db
      .select()
      .from(trustedDevices)
      .where(
        and(
          trustedDeviceRepository.clientDeviceMatch(userId, clientDeviceId),
          isNull(trustedDevices.revokedAt)
        )
      )
      .limit(1);
    return device ?? null;
  },

  async findRevokedByClientDeviceId(userId: string, clientDeviceId: string) {
    const [device] = await db
      .select()
      .from(trustedDevices)
      .where(
        and(
          trustedDeviceRepository.clientDeviceMatch(userId, clientDeviceId),
          isNotNull(trustedDevices.revokedAt)
        )
      )
      .limit(1);
    return device ?? null;
  },

  async create(
    data: {
      userId: string;
      deviceName: string;
      devicePublicKey?: Record<string, unknown> | null;
      clientDeviceId?: string | null;
      browser?: string | null;
      platform?: string | null;
      deviceType?: string | null;
    },
    client: DbClient = db
  ) {
    const clientDeviceId =
      data.clientDeviceId ??
      (typeof data.devicePublicKey?.deviceId === "string" ? data.devicePublicKey.deviceId : null);

    const [device] = await client
      .insert(trustedDevices)
      .values({
        userId: data.userId,
        clientDeviceId,
        deviceName: data.deviceName,
        devicePublicKey: data.devicePublicKey ?? null,
        browser: data.browser ?? null,
        platform: data.platform ?? null,
        deviceType: data.deviceType ?? null,
        lastUsedAt: new Date(),
      })
      .returning();
    return device;
  },

  async updateDeviceName(id: string, userId: string, deviceName: string) {
    const [device] = await db
      .update(trustedDevices)
      .set({ deviceName })
      .where(
        and(
          eq(trustedDevices.id, id),
          eq(trustedDevices.userId, userId),
          isNull(trustedDevices.revokedAt)
        )
      )
      .returning();
    return device ?? null;
  },

  async updateLastUsed(id: string, userId: string) {
    const [device] = await db
      .update(trustedDevices)
      .set({ lastUsedAt: new Date() })
      .where(and(eq(trustedDevices.id, id), eq(trustedDevices.userId, userId)))
      .returning();
    return device ?? null;
  },

  async revoke(id: string, userId: string, client: DbClient = db) {
    const [device] = await client
      .update(trustedDevices)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(trustedDevices.id, id),
          eq(trustedDevices.userId, userId),
          isNull(trustedDevices.revokedAt)
        )
      )
      .returning();
    return device ?? null;
  },
};
