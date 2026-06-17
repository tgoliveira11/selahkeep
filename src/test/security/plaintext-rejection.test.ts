import { describe, it, expect } from "vitest";
import { rejectPlaintextFields } from "@/lib/validation/plaintext-forbidden";
import { createNoteSchema } from "@/lib/validation/notes";
import { rejectPlaintextNoteFields } from "@/lib/validation/notes";
import { assertNoPlaintextFields, PlaintextRejectionError } from "@/server/policies/plaintext-rejection";

const validEncryptedPayload = {
  version: "enc-v1" as const,
  alg: "AES-GCM" as const,
  iv: "dGVzdC1pdg",
  ciphertext: "dGVzdC1jaXBoZXJ0ZXh0",
  aad: {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    resourceId: "550e8400-e29b-41d4-a716-446655440001",
    field: "note_metadata" as const,
  },
};

describe("plaintext rejection", () => {
  it("rejects title field", () => {
    expect(rejectPlaintextFields({ title: "secret" })).toContain("title");
  });

  it("rejects body field", () => {
    expect(rejectPlaintextFields({ body: "secret" })).toContain("body");
  });

  it("rejects content field", () => {
    expect(rejectPlaintextFields({ content: "secret" })).toContain("content");
  });

  it("rejects plaintextTitle field", () => {
    expect(rejectPlaintextFields({ plaintextTitle: "secret" })).toContain("plaintextTitle");
  });

  it("allows encrypted-only payload", () => {
    expect(
      rejectPlaintextFields({
        encryptedMetadata: validEncryptedPayload,
        encryptedBody: { ...validEncryptedPayload, aad: { ...validEncryptedPayload.aad, field: "note_body" } },
        encryptedWrappedNoteKey: { ...validEncryptedPayload, aad: { ...validEncryptedPayload.aad, field: "note_key" } },
      })
    ).toBeNull();
  });

  it("assertNoPlaintextFields throws PlaintextRejectionError", () => {
    expect(() => assertNoPlaintextFields({ body: "x" })).toThrow(PlaintextRejectionError);
  });

  it("createNoteSchema rejects missing encrypted fields", () => {
    const result = createNoteSchema.safeParse({ title: "hello" });
    expect(result.success).toBe(false);
  });

  it("createNoteSchema accepts valid encrypted payload", () => {
    const result = createNoteSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440001",
      encryptedMetadata: validEncryptedPayload,
      encryptedBody: { ...validEncryptedPayload, aad: { ...validEncryptedPayload.aad, field: "note_body" } },
      encryptedWrappedNoteKey: { ...validEncryptedPayload, aad: { ...validEncryptedPayload.aad, field: "note_key" } },
      bodyEncryptionVersion: "enc-v1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects plaintext category, tag, and answered fields on notes", () => {
    for (const field of ["categoryName", "tagNames", "answered", "categoryId", "tags"] as const) {
      expect(rejectPlaintextNoteFields({ [field]: "x" })).toContain(field);
    }
  });
});
