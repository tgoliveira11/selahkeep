import { z } from "zod";
import { encryptedPayloadSchema, ENCRYPTION_VERSION } from "./encrypted-payload";

/**
 * Payload accepted by `POST /api/notes/:id/versions`. The server assigns the
 * monotonic `version_number`; the client supplies a UUID `id` (the versionId
 * that the content payloads are AAD-bound to).
 */
export const createNoteVersionSchema = z.object({
  id: z.string().uuid(),
  encryptedMetadata: encryptedPayloadSchema,
  encryptedBody: encryptedPayloadSchema,
  encryptedWrappedNoteKey: encryptedPayloadSchema,
  bodyEncryptionVersion: z.literal(ENCRYPTION_VERSION),
});

export type CreateNoteVersionInput = z.infer<typeof createNoteVersionSchema>;
