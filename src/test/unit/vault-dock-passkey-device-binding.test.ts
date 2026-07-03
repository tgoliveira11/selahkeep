import { describe, it, expect, vi } from "vitest";
import { resolveVaultDockPasskeyAvailability } from "@/features/vault/use-vault-dock-passkey-available";
import type { VaultStatus } from "@/lib/api-client/vault";

vi.mock("@/lib/passkey/prf-support", () => ({
  isPrfExtensionSupported: vi.fn(() => true),
}));

const baseStatus: VaultStatus = {
  initialized: true,
  hasVault: true,
  setupPhase: "complete",
  setupComplete: true,
  availableUnlockMethods: { password: true, recoveryPhrase: true, passkey: true },
};

describe("resolveVaultDockPasskeyAvailability", () => {
  it("hides passkey when account has envelope but this device is not bound", () => {
    expect(
      resolveVaultDockPasskeyAvailability({
        ...baseStatus,
        passkeyUnlockAvailableOnThisDevice: false,
      })
    ).toEqual({
      hasEnvelope: true,
      showPasskey: false,
      prfExplicitlyUnsupported: false,
    });
  });

  it("shows passkey when envelope exists and this device is bound", () => {
    expect(
      resolveVaultDockPasskeyAvailability({
        ...baseStatus,
        passkeyUnlockAvailableOnThisDevice: true,
      })
    ).toEqual({
      hasEnvelope: true,
      showPasskey: true,
      prfExplicitlyUnsupported: false,
    });
  });

  it("returns no envelope when passkey unlock is not configured on the account", () => {
    expect(
      resolveVaultDockPasskeyAvailability({
        ...baseStatus,
        availableUnlockMethods: { password: true, recoveryPhrase: true, passkey: false },
        passkeyUnlockAvailableOnThisDevice: false,
      })
    ).toEqual({
      hasEnvelope: false,
      showPasskey: false,
      prfExplicitlyUnsupported: false,
    });
  });
});
