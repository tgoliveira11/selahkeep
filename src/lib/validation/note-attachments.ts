import { z } from "zod";
import { encryptedPayloadSchema, ENCRYPTION_VERSION } from "./encrypted-payload";

export const createAttachmentSchema = z.object({
  id: z.string().uuid(),
  encryptedMetadata: encryptedPayloadSchema,
  encryptedBlob: encryptedPayloadSchema,
  blobEncryptionVersion: z.literal(ENCRYPTION_VERSION),
  ciphertextBytes: z.number().int().positive(),
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;

export const PLAINTEXT_ATTACHMENT_FIELDS = [
  "filename",
  "mimeType",
  "content",
  "blob",
  "data",
  "file",
  "attachment",
] as const;

export function rejectPlaintextAttachmentFields(
  body: Record<string, unknown>
): string | null {
  for (const key of PLAINTEXT_ATTACHMENT_FIELDS) {
    if (key in body && body[key] !== undefined && body[key] !== null) {
      return `Plaintext attachment field "${key}" is not allowed`;
    }
  }
  return null;
}
