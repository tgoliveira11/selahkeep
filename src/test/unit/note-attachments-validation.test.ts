import { describe, it, expect } from "vitest";
import {
  createAttachmentSchema,
  rejectPlaintextAttachmentFields,
  PLAINTEXT_ATTACHMENT_FIELDS,
} from "@/lib/validation/note-attachments";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { encryptedPayload } from "@/test/helpers/fixtures";

const ATTACHMENT_ID = "550e8400-e29b-41d4-a716-446655440005";

describe("note attachment validation", () => {
  it("accepts encrypted attachment payloads", () => {
    const parsed = createAttachmentSchema.safeParse({
      id: ATTACHMENT_ID,
      encryptedMetadata: encryptedPayload("note_attachment_metadata", ATTACHMENT_ID),
      encryptedBlob: encryptedPayload("note_attachment_blob", ATTACHMENT_ID),
      blobEncryptionVersion: ENCRYPTION_VERSION,
      ciphertextBytes: 512,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects plaintext attachment field names", () => {
    for (const field of PLAINTEXT_ATTACHMENT_FIELDS) {
      const error = rejectPlaintextAttachmentFields({ [field]: "secret" });
      expect(error).toMatch(new RegExp(field));
    }
    expect(rejectPlaintextAttachmentFields({ encryptedMetadata: {} })).toBeNull();
  });
});
