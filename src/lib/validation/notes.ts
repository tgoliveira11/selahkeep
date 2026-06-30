import { z } from "zod";
import { encryptedPayloadSchema, ENCRYPTION_VERSION } from "./encrypted-payload";

const PLAINTEXT_FORBIDDEN_FIELDS = [
  "title",
  "body",
  "content",
  "message",
  "markdown",
  "tags",
  "tagIds",
  "tagNames",
  "category",
  "categoryId",
  "categoryName",
  "answered",
  "pinned",
  "favorite",
  "archived",
  "trashed",
  "trashedAt",
  "resolved",
  "noteKey",
  "plaintextTitle",
  "plaintextBody",
  "decryptedContent",
  "metadata",
  "kanban",
  "board",
  "columns",
  "cards",
  "column",
  "card",
  "boardState",
  "labels",
  "label",
  "priority",
  "dueDate",
  "description",
] as const;

export function rejectPlaintextNoteFields(body: Record<string, unknown>): string | null {
  for (const field of PLAINTEXT_FORBIDDEN_FIELDS) {
    if (field in body && body[field] !== undefined) {
      return `Plaintext field '${field}' is not allowed`;
    }
  }
  return null;
}

export const createNoteSchema = z.object({
  id: z.string().uuid(),
  encryptedMetadata: encryptedPayloadSchema,
  encryptedBody: encryptedPayloadSchema,
  encryptedWrappedNoteKey: encryptedPayloadSchema,
  bodyEncryptionVersion: z.literal(ENCRYPTION_VERSION),
});

export const updateNoteSchema = z.object({
  encryptedMetadata: encryptedPayloadSchema.optional(),
  encryptedBody: encryptedPayloadSchema.optional(),
  encryptedWrappedNoteKey: encryptedPayloadSchema.optional(),
  bodyEncryptionVersion: z.literal(ENCRYPTION_VERSION).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
