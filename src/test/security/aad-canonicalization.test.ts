import { describe, it, expect } from "vitest";
import { encryptField, decryptField } from "@/lib/crypto-client/aes-gcm";
import { generateAesKey } from "@/lib/crypto-client/aes-gcm";

describe("AAD canonicalization", () => {
  it("decrypts payloads after jsonb-style aad key reordering", async () => {
    const key = await generateAesKey();
    const aad = {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      resourceId: "550e8400-e29b-41d4-a716-446655440001",
      field: "body" as const,
    };

    const payload = await encryptField("secret letter body", key, aad);

    // Simulate PostgreSQL jsonb returning keys in a different order.
    const fromDb = {
      ...payload,
      aad: {
        field: payload.aad.field,
        resourceId: payload.aad.resourceId,
        userId: payload.aad.userId,
      },
    };

    const plaintext = await decryptField(fromDb, key);
    expect(plaintext).toBe("secret letter body");
  });
});
