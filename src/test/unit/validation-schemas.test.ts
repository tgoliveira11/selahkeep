import { describe, it, expect } from "vitest";
import { vaultInitSchema, recoveryCodeSchema, recoveryPhraseReplaceSchema } from "@/lib/validation/vault";
import {
  twoFactorLoginVerifySchema,
  twoFactorVerifySchema,
  totpCodeSchema,
} from "@/lib/validation/two-factor";
import { createNoteInput, encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

describe("validation schemas", () => {
  it("vaultInitSchema accepts recovery_code envelope", () => {
    const result = vaultInitSchema.safeParse({
      vaultVersion: "vault-v1",
      envelopes: [
        {
          method: "recovery_code",
          encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          kdfMetadata: {
            kdf: "argon2id",
            version: "kdf-v1",
            salt: "c2FsdA",
            memory: 65536,
            iterations: 3,
            parallelism: 1,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("vaultInitSchema rejects trusted_device method", () => {
    const result = vaultInitSchema.safeParse({
      vaultVersion: "vault-v1",
      envelopes: [
        {
          method: "trusted_device",
          encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("vaultInitSchema rejects empty envelopes", () => {
    const result = vaultInitSchema.safeParse({ vaultVersion: "vault-v1", envelopes: [] });
    expect(result.success).toBe(false);
  });

  it("recoveryCodeSchema requires kdf metadata", () => {
    const result = recoveryCodeSchema.safeParse({
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      kdfMetadata: {
        kdf: "argon2id",
        version: "kdf-v1",
        salt: "c2FsdA",
        memory: 65536,
        iterations: 3,
        parallelism: 1,
      },
    });
    expect(result.success).toBe(true);
  });

  it("recoveryPhraseReplaceSchema accepts encrypted envelope with phrase length metadata", () => {
    const result = recoveryPhraseReplaceSchema.safeParse({
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      kdfMetadata: {
        kdf: "argon2id",
        version: "kdf-v1",
        salt: "c2FsdA",
        memory: 65536,
        iterations: 3,
        parallelism: 1,
      },
      publicMetadata: { phraseLength: 24 },
    });
    expect(result.success).toBe(true);
  });

  it("createNoteInput fixture matches createNoteSchema", async () => {
    const { createNoteSchema } = await import("@/lib/validation/notes");
    expect(createNoteSchema.safeParse(createNoteInput()).success).toBe(true);
  });

  it("twoFactorVerifySchema accepts TOTP or backup code", () => {
    expect(twoFactorVerifySchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(twoFactorVerifySchema.safeParse({ backupCode: "AAAA-BBBB-CCCC" }).success).toBe(
      true
    );
    expect(twoFactorVerifySchema.safeParse({}).success).toBe(false);
    expect(totpCodeSchema.safeParse("12ab56").success).toBe(false);
  });

  it("twoFactorLoginVerifySchema requires challenge token and code", () => {
    expect(
      twoFactorLoginVerifySchema.safeParse({
        challengeToken: "challenge-token-1234567890",
        backupCode: "AAAA-BBBB-CCCC",
      }).success
    ).toBe(true);
    expect(
      twoFactorLoginVerifySchema.safeParse({
        challengeToken: "short",
        code: "123456",
      }).success
    ).toBe(false);
  });
});
