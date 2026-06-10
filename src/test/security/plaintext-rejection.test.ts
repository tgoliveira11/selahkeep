import { describe, it, expect } from "vitest";
import { rejectPlaintextFields } from "@/lib/validation/letters";
import { createLetterSchema } from "@/lib/validation/letters";
import { assertNoPlaintextFields, PlaintextRejectionError } from "@/server/policies/plaintext-rejection";

const validEncryptedPayload = {
  version: "enc-v1" as const,
  alg: "AES-GCM" as const,
  iv: "dGVzdC1pdg",
  ciphertext: "dGVzdC1jaXBoZXJ0ZXh0",
  aad: {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    resourceId: "550e8400-e29b-41d4-a716-446655440001",
    field: "title" as const,
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
        encryptedTitle: validEncryptedPayload,
        encryptedBody: { ...validEncryptedPayload, aad: { ...validEncryptedPayload.aad, field: "body" } },
        encryptedLetterKey: { ...validEncryptedPayload, aad: { ...validEncryptedPayload.aad, field: "letter_key" } },
      })
    ).toBeNull();
  });

  it("assertNoPlaintextFields throws PlaintextRejectionError", () => {
    expect(() => assertNoPlaintextFields({ body: "x" })).toThrow(PlaintextRejectionError);
  });

  it("createLetterSchema rejects missing encrypted fields", () => {
    const result = createLetterSchema.safeParse({ title: "hello" });
    expect(result.success).toBe(false);
  });

  it("createLetterSchema accepts valid encrypted payload", () => {
    const result = createLetterSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440001",
      encryptedTitle: validEncryptedPayload,
      encryptedBody: { ...validEncryptedPayload, aad: { ...validEncryptedPayload.aad, field: "body" } },
      encryptedLetterKey: { ...validEncryptedPayload, aad: { ...validEncryptedPayload.aad, field: "letter_key" } },
      encryptionVersion: "enc-v1",
    });
    expect(result.success).toBe(true);
  });
});
