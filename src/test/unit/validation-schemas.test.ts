import { describe, it, expect } from "vitest";
import { vaultInitSchema, recoveryCodeSchema } from "@/lib/validation/vault";
import { createTrustedDeviceSchema, updateTrustedDeviceSchema, touchTrustedDeviceSchema } from "@/lib/validation/trusted-devices";
import {
  twoFactorLoginVerifySchema,
  twoFactorVerifySchema,
  totpCodeSchema,
} from "@/lib/validation/two-factor";
import { createNoteInput, encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

describe("validation schemas", () => {
  it("vaultInitSchema accepts trusted device envelope", () => {
    const result = vaultInitSchema.safeParse({
      vaultVersion: "vault-v1",
      envelopes: [
        {
          method: "trusted_device",
          encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          trustedDevice: { deviceName: "Chrome on macOS" },
        },
      ],
    });
    expect(result.success).toBe(true);
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

  it("createTrustedDeviceSchema accepts encrypted vault key", () => {
    const result = createTrustedDeviceSchema.safeParse({
      deviceName: "Safari",
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
    });
    expect(result.success).toBe(true);
  });

  it("updateTrustedDeviceSchema requires device name", () => {
    expect(updateTrustedDeviceSchema.safeParse({ deviceName: "Work laptop" }).success).toBe(true);
    expect(updateTrustedDeviceSchema.safeParse({ deviceName: "" }).success).toBe(false);
  });

  it("touchTrustedDeviceSchema requires uuid deviceId", () => {
    expect(
      touchTrustedDeviceSchema.safeParse({
        deviceId: "550e8400-e29b-41d4-a716-446655440000",
      }).success
    ).toBe(true);
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
