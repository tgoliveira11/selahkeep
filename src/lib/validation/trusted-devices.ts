import { z } from "zod";
import { encryptedPayloadSchema } from "./encrypted-payload";

export const createTrustedDeviceSchema = z.object({
  deviceName: z.string().min(1).max(200),
  devicePublicKey: z.record(z.unknown()).optional(),
  browser: z.string().optional(),
  platform: z.string().optional(),
  deviceType: z.enum(["desktop", "mobile", "tablet", "unknown"]).optional(),
  encryptedVaultKey: encryptedPayloadSchema,
});

export const updateTrustedDeviceSchema = z.object({
  deviceName: z.string().min(1).max(200),
});

export const touchTrustedDeviceSchema = z.object({
  deviceId: z.string().uuid(),
});

export type CreateTrustedDeviceInput = z.infer<typeof createTrustedDeviceSchema>;
export type UpdateTrustedDeviceInput = z.infer<typeof updateTrustedDeviceSchema>;
export type TouchTrustedDeviceInput = z.infer<typeof touchTrustedDeviceSchema>;
