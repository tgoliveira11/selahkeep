/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveVaultDockPasskeyAvailability,
  toVaultServerStatusSnapshot,
} from "@/features/vault/vault-dock-passkey-availability";

describe("resolveVaultDockPasskeyAvailability", () => {
  const originalPublicKeyCredential = globalThis.PublicKeyCredential;

  beforeEach(() => {
    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      prototype: { getClientExtensionResults: () => ({}) },
    } as unknown as typeof PublicKeyCredential;
  });

  afterEach(() => {
    globalThis.PublicKeyCredential = originalPublicKeyCredential;
    vi.restoreAllMocks();
  });

  it("hides passkey when envelope exists but this browser is not bound", () => {
    expect(
      resolveVaultDockPasskeyAvailability({
        hasPasskey: true,
        passkeyUnlockAvailableOnThisDevice: false,
        availableUnlockMethods: { passkey: true, password: true, recoveryPhrase: true },
        initialized: true,
        hasVault: true,
        setupPhase: "complete",
        setupComplete: true,
      })
    ).toEqual({
      hasEnvelope: true,
      showPasskey: false,
      prfExplicitlyUnsupported: false,
    });
  });

  it("shows passkey when envelope exists, PRF supported, and device is bound", () => {
    expect(
      resolveVaultDockPasskeyAvailability({
        hasPasskey: true,
        passkeyUnlockAvailableOnThisDevice: true,
        availableUnlockMethods: { passkey: true, password: true, recoveryPhrase: true },
        initialized: true,
        hasVault: true,
        setupPhase: "complete",
        setupComplete: true,
      })
    ).toEqual({
      hasEnvelope: true,
      showPasskey: true,
      prfExplicitlyUnsupported: false,
    });
  });

  it("maps VaultStatus to vault-core server snapshot", () => {
    expect(
      toVaultServerStatusSnapshot({
        hasPasskey: true,
        passkeyUnlockAvailableOnThisDevice: false,
        initialized: true,
        hasVault: true,
        setupPhase: "complete",
        setupComplete: true,
      })
    ).toEqual({
      configured: true,
      hasPasskeyPrfEnvelope: true,
      passkeyUnlockAvailableOnThisDevice: false,
    });
  });
});
