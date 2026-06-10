import { z } from "zod";
import { encryptedPayloadSchema, kdfMetadataSchema } from "./encrypted-payload";

export const vaultInitSchema = z.object({
  vaultVersion: z.string().min(1),
  envelopes: z
    .array(
      z.object({
        method: z.enum(["trusted_device", "passkey_authorized_device", "recovery_code"]),
        encryptedVaultKey: encryptedPayloadSchema,
        kdfMetadata: kdfMetadataSchema.optional(),
        publicMetadata: z.record(z.unknown()).optional(),
        trustedDevice: z
          .object({
            deviceName: z.string().min(1).max(200),
            devicePublicKey: z.record(z.unknown()).optional(),
            browser: z.string().optional(),
            platform: z.string().optional(),
            deviceType: z.enum(["desktop", "mobile", "tablet", "unknown"]).optional(),
          })
          .optional(),
      })
    )
    .min(1),
});

export const recoveryCodeSchema = z.object({
  encryptedVaultKey: encryptedPayloadSchema,
  kdfMetadata: kdfMetadataSchema,
});

export const unlockWithRecoveryCodeSchema = z.object({
  encryptedVaultKey: encryptedPayloadSchema,
  kdfMetadata: kdfMetadataSchema,
});

export type VaultInitInput = z.infer<typeof vaultInitSchema>;
export type RecoveryCodeInput = z.infer<typeof recoveryCodeSchema>;
