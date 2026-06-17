import { z } from "zod";
import { encryptedPayloadSchema, kdfMetadataSchema } from "./encrypted-payload";

const PLAINTEXT_FORBIDDEN_VAULT_FIELDS = [
  "vaultPassword",
  "password",
  "recoveryPhrase",
  "recoveryWords",
  "userVaultKey",
  "noteKey",
  "title",
  "body",
  "content",
  "message",
  "tags",
  "tagIds",
  "tagNames",
  "category",
  "categoryId",
  "categoryName",
  "answered",
  "unlockBehavior",
  "categories",
  "plaintextTitle",
  "plaintextBody",
] as const;

const ALLOWED_ENCRYPTED_PREFIXES = [
  "encrypted",
  "kdf",
  "public",
  "vaultVersion",
  "envelopes",
  "method",
  "id",
  "answered",
  "encryptionVersion",
] as const;

export function rejectVaultPlaintextFields(body: Record<string, unknown>): string | null {
  for (const field of PLAINTEXT_FORBIDDEN_VAULT_FIELDS) {
    if (field in body && body[field] !== undefined) {
      return `Plaintext field '${field}' is not allowed`;
    }
  }
  return null;
}

export function assertNoVaultPlaintextFields(body: Record<string, unknown>): void {
  const error = rejectVaultPlaintextFields(body);
  if (error) {
    throw new VaultPlaintextRejectionError(error);
  }
}

export class VaultPlaintextRejectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultPlaintextRejectionError";
  }
}

const ltgEnvelopeSchema = z.object({
  method: z.enum(["password", "recovery_phrase"]),
  encryptedVaultKey: encryptedPayloadSchema,
  kdfMetadata: kdfMetadataSchema,
  publicMetadata: z.record(z.unknown()).optional(),
});

export const vaultSetupSchema = z.object({
  vaultVersion: z.literal("vault-v2"),
  encryptedVaultSettings: encryptedPayloadSchema,
  encryptedVaultIndex: encryptedPayloadSchema,
  envelopes: z.array(ltgEnvelopeSchema).length(2),
});

export const vaultUnlockEnvelopeRequestSchema = z.object({
  method: z.enum(["password", "recovery_phrase", "recovery_code"]),
});

export const vaultInitSchema = z.object({
  vaultVersion: z.string().min(1),
  envelopes: z
    .array(
      z.object({
        method: z.enum([
          "passkey_authorized_device",
          "recovery_code",
          "password",
          "recovery_phrase",
        ]),
        encryptedVaultKey: encryptedPayloadSchema,
        kdfMetadata: kdfMetadataSchema.optional(),
        publicMetadata: z.record(z.unknown()).optional(),
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

export const vaultSettingsUpdateSchema = z.object({
  encryptedVaultSettings: encryptedPayloadSchema,
});

export type VaultSettingsUpdateInput = z.infer<typeof vaultSettingsUpdateSchema>;
export type VaultSetupInput = z.infer<typeof vaultSetupSchema>;
export type VaultInitInput = z.infer<typeof vaultInitSchema>;
export type RecoveryCodeInput = z.infer<typeof recoveryCodeSchema>;

export { ALLOWED_ENCRYPTED_PREFIXES };
