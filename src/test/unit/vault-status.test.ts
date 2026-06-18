import { describe, it, expect } from "vitest";
import {
  deriveClientStatus,
  deriveClientStatusFromServer,
  deriveSetupPhase,
  getVaultStatusCopy,
  normalizeVaultStatus,
} from "@/lib/vault/vault-status";
import type { VaultStatus } from "@/lib/api-client/vault";

const completeLtgStatus: VaultStatus = {
  initialized: true,
  hasVault: true,
  setupPhase: "complete",
  setupComplete: true,
  vaultVersion: "vault-v2",
  ltgSetupComplete: true,
  hasEncryptedSettings: true,
  hasEncryptedIndex: true,
  methods: ["password", "recovery_phrase"],
  recoveryState: "Protected",
};

describe("vault status model", () => {
  it("deriveSetupPhase returns not_configured when vault is missing", () => {
    expect(
      deriveSetupPhase({
        initialized: false,
        vaultVersion: undefined,
        ltgSetupComplete: false,
        hasEncryptedSettings: false,
        hasEncryptedIndex: false,
        methods: [],
      })
    ).toBe("not_configured");
  });

  it("deriveSetupPhase returns setup_incomplete for vault-v2 missing settings", () => {
    expect(
      deriveSetupPhase({
        initialized: true,
        vaultVersion: "vault-v2",
        ltgSetupComplete: true,
        hasEncryptedSettings: false,
        hasEncryptedIndex: true,
        methods: ["password", "recovery_phrase"],
      })
    ).toBe("setup_incomplete");
  });

  it("deriveSetupPhase returns setup_incomplete for vault-v2 missing index", () => {
    expect(
      deriveSetupPhase({
        initialized: true,
        vaultVersion: "vault-v2",
        ltgSetupComplete: true,
        hasEncryptedSettings: true,
        hasEncryptedIndex: false,
        methods: ["password", "recovery_phrase"],
      })
    ).toBe("setup_incomplete");
  });

  it("deriveSetupPhase returns setup_incomplete for vault-v2 missing envelopes", () => {
    expect(
      deriveSetupPhase({
        initialized: true,
        vaultVersion: "vault-v2",
        ltgSetupComplete: false,
        hasEncryptedSettings: true,
        hasEncryptedIndex: true,
        methods: ["password"],
      })
    ).toBe("setup_incomplete");
  });

  it("deriveSetupPhase returns complete for vault-v2 with required pieces", () => {
    expect(
      deriveSetupPhase({
        initialized: true,
        vaultVersion: "vault-v2",
        ltgSetupComplete: true,
        hasEncryptedSettings: true,
        hasEncryptedIndex: true,
        methods: ["password", "recovery_phrase"],
      })
    ).toBe("complete");
  });

  it("deriveSetupPhase returns complete for legacy vault-v1 with envelopes", () => {
    expect(
      deriveSetupPhase({
        initialized: true,
        vaultVersion: "vault-v1",
        ltgSetupComplete: false,
        hasEncryptedSettings: false,
        hasEncryptedIndex: false,
        methods: ["recovery_code"],
      })
    ).toBe("complete");
  });

  it("deriveSetupPhase returns setup_incomplete for legacy vault-v1 without envelopes", () => {
    expect(
      deriveSetupPhase({
        initialized: true,
        vaultVersion: "vault-v1",
        ltgSetupComplete: false,
        hasEncryptedSettings: false,
        hasEncryptedIndex: false,
        methods: [],
      })
    ).toBe("setup_incomplete");
  });

  it("deriveClientStatus maps complete + unlocked to unlocked", () => {
    expect(deriveClientStatus("complete", true)).toBe("unlocked");
  });

  it("deriveClientStatus maps complete + locked session to locked", () => {
    expect(deriveClientStatus("complete", false)).toBe("locked");
  });

  it("deriveClientStatus maps not_configured regardless of session", () => {
    expect(deriveClientStatus("not_configured", true)).toBe("not_configured");
    expect(deriveClientStatus("not_configured", false)).toBe("not_configured");
  });

  it("deriveClientStatus maps setup_incomplete regardless of session", () => {
    expect(deriveClientStatus("setup_incomplete", true)).toBe("setup_incomplete");
  });

  it("deriveClientStatusFromServer combines server status and session", () => {
    expect(deriveClientStatusFromServer(completeLtgStatus, false)).toBe("locked");
    expect(deriveClientStatusFromServer(completeLtgStatus, true)).toBe("unlocked");
  });

  it("getVaultStatusCopy returns setup CTA for not_configured", () => {
    const copy = getVaultStatusCopy("not_configured");
    expect(copy.badgeLabel).toBe("Vault not set up");
    expect(copy.actionLabel).toBe("Set up vault");
    expect(copy.actionHref).toBe("/vault/setup");
    expect(copy.promptTitle).toBe("Set up your vault to start writing");
  });

  it("getVaultStatusCopy returns continue setup CTA for setup_incomplete", () => {
    const copy = getVaultStatusCopy("setup_incomplete");
    expect(copy.badgeLabel).toBe("Vault setup incomplete");
    expect(copy.actionLabel).toBe("Continue setup");
    expect(copy.actionHref).toBe("/vault/setup");
  });

  it("getVaultStatusCopy returns unlock CTA for locked", () => {
    const copy = getVaultStatusCopy("locked");
    expect(copy.badgeLabel).toBe("Vault locked");
    expect(copy.actionLabel).toBe("Unlock vault");
    expect(copy.actionHref).toBe("/vault/unlock");
  });

  it("normalizeVaultStatus exposes hasVault and setupComplete", () => {
    const normalized = normalizeVaultStatus(completeLtgStatus, false);
    expect(normalized).toEqual({
      hasVault: true,
      setupComplete: true,
      unlocked: false,
      status: "locked",
      setupPhase: "complete",
      availableUnlockMethods: undefined,
    });
  });

  it("getVaultStatusCopy returns lock action for unlocked", () => {
    const copy = getVaultStatusCopy("unlocked");
    expect(copy.badgeLabel).toBe("Vault unlocked");
    expect(copy.actionLabel).toBe("Lock vault");
  });

  it("getVaultStatusCopy recovery context routes not configured to setup", () => {
    const copy = getVaultStatusCopy("not_configured", "recovery");
    expect(copy.actionHref).toBe("/vault/setup");
    expect(copy.promptDescription).toMatch(/recovery phrase/i);
  });

  it("getVaultStatusCopy recovery context routes locked to unlock", () => {
    const copy = getVaultStatusCopy("locked", "recovery");
    expect(copy.actionHref).toBe("/vault/unlock");
    expect(copy.promptDescription).toMatch(/replace your recovery phrase/i);
  });

  it("getVaultStatusCopy security context routes not configured to setup", () => {
    const copy = getVaultStatusCopy("not_configured", "security");
    expect(copy.promptTitle).toBe("Set up your vault");
    expect(copy.actionHref).toBe("/vault/setup");
  });

  it("getVaultStatusCopy security context routes setup incomplete to setup", () => {
    const copy = getVaultStatusCopy("setup_incomplete", "security");
    expect(copy.promptCta).toBe("Continue setup");
  });
});
