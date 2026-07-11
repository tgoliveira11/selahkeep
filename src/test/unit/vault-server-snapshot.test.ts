import { describe, expect, it } from "vitest";
import { toVaultServerStatusSnapshot } from "@/lib/vault/vault-server-snapshot";

describe("toVaultServerStatusSnapshot", () => {
  it("forwards passkeyUnlockAvailableOnThisDevice for vault-core dock gating", () => {
    expect(
      toVaultServerStatusSnapshot({
        initialized: true,
        hasVault: true,
        setupPhase: "complete",
        setupComplete: true,
        availableUnlockMethods: { passkey: true, password: true, recoveryPhrase: true },
        passkeyUnlockAvailableOnThisDevice: false,
      })
    ).toEqual({
      configured: true,
      hasPasskeyPrfEnvelope: true,
      passkeyUnlockAvailableOnThisDevice: false,
    });
  });
});
