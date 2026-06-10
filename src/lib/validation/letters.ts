import { z } from "zod";
import { encryptedPayloadSchema, ENCRYPTION_VERSION } from "./encrypted-payload";

const PLAINTEXT_FORBIDDEN_FIELDS = [
  "title",
  "body",
  "content",
  "message",
  "plaintextTitle",
  "plaintextBody",
  "decryptedContent",
] as const;

export function rejectPlaintextFields(body: Record<string, unknown>): string | null {
  for (const field of PLAINTEXT_FORBIDDEN_FIELDS) {
    if (field in body && body[field] !== undefined) {
      return `Plaintext field '${field}' is not allowed`;
    }
  }
  return null;
}

export const createLetterSchema = z.object({
  id: z.string().uuid(),
  encryptedTitle: encryptedPayloadSchema,
  encryptedBody: encryptedPayloadSchema,
  encryptedLetterKey: encryptedPayloadSchema,
  encryptionVersion: z.literal(ENCRYPTION_VERSION),
  answered: z.boolean().optional().default(false),
});

export const updateLetterSchema = z.object({
  encryptedTitle: encryptedPayloadSchema.optional(),
  encryptedBody: encryptedPayloadSchema.optional(),
  encryptedLetterKey: encryptedPayloadSchema.optional(),
  encryptionVersion: z.literal(ENCRYPTION_VERSION).optional(),
  answered: z.boolean().optional(),
  answeredAt: z.string().datetime().nullable().optional(),
});

export type CreateLetterInput = z.infer<typeof createLetterSchema>;
export type UpdateLetterInput = z.infer<typeof updateLetterSchema>;
