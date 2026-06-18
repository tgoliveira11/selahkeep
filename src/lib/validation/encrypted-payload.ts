import { z } from "zod";

export const ENCRYPTION_VERSION = "enc-v1";
export const ENCRYPTION_ALG = "AES-GCM";

const aadSchema = z.object({
  userId: z.string().uuid(),
  resourceId: z.string().uuid(),
  field: z.enum([
    "title",
    "body",
    "letter_key",
    "note_metadata",
    "note_body",
    "note_key",
    "vault_key",
    "vault_settings",
    "vault_index",
    "note_draft",
  ]),
});

export const encryptedPayloadSchema = z.object({
  version: z.literal(ENCRYPTION_VERSION),
  alg: z.literal(ENCRYPTION_ALG),
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
  aad: aadSchema,
});

export type EncryptedPayload = z.infer<typeof encryptedPayloadSchema>;

export const kdfMetadataSchema = z.union([
  z.object({
    kdf: z.literal("argon2id"),
    version: z.literal("kdf-v1"),
    salt: z.string().min(1),
    memory: z.number().int().positive(),
    iterations: z.number().int().positive(),
    parallelism: z.number().int().positive(),
  }),
  z.object({
    kdf: z.literal("pbkdf2-sha256"),
    version: z.literal("kdf-v1"),
    salt: z.string().min(1),
    iterations: z.number().int().positive(),
  }),
]);

export type KdfMetadata = z.infer<typeof kdfMetadataSchema>;
