import { describe, it, expect } from "vitest";
import {
  derivePasskeyVaultUnlockDisplayStatus,
  deriveVaultHealthSummary,
  formatAutoLockStatus,
  formatPasskeyVaultUnlockStatus,
} from "@/lib/vault/vault-health-summary";

describe("vault health summary", () => {
  const completeStatus = {
    initialized: true,
    hasVault: true,
    setupPhase: "complete" as const,
    setupComplete: true,
    hasVaultPassword: true,
    hasRecoveryPhrase: true,
    availableUnlockMethods: { password: true, recoveryPhrase: true, passkey: false },
  };

  it("marks incomplete setup", () => {
    const summary = deriveVaultHealthSummary({
      setupPhase: "not_configured",
      serverStatus: null,
      passkeyDisplayStatus: "not_configured",
    });
    expect(summary.level).toBe("incomplete");
    expect(summary.protection).toBe("Incomplete");
    expect(summary.recovery).toBe("Unknown");
  });

  it("shows strong protection when password and recovery are configured", () => {
    const summary = deriveVaultHealthSummary({
      setupPhase: "complete",
      serverStatus: completeStatus,
      passkeyDisplayStatus: "configured",
    });
    expect(summary.level).toBe("strong");
    expect(summary.protection).toBe("Strong");
    expect(summary.recovery).toBe("Configured");
  });

  it("shows needs attention when recovery is missing", () => {
    const summary = deriveVaultHealthSummary({
      setupPhase: "complete",
      serverStatus: {
        ...completeStatus,
        hasRecoveryPhrase: false,
        availableUnlockMethods: { password: true, recoveryPhrase: false, passkey: false },
      },
      passkeyDisplayStatus: "not_configured",
    });
    expect(summary.level).toBe("needs_attention");
    expect(summary.recovery).toBe("Missing");
  });

  it("formats passkey and auto-lock labels", () => {
    expect(formatPasskeyVaultUnlockStatus("unsupported_in_browser")).toBe(
      "Unsupported in this browser"
    );
    expect(formatAutoLockStatus()).toMatch(/Enabled/);
    expect(derivePasskeyVaultUnlockDisplayStatus(true, "unsupported")).toBe(
      "unsupported_in_browser"
    );
  });

  it("does not invent last unlock method", () => {
    const summary = deriveVaultHealthSummary({
      setupPhase: "complete",
      serverStatus: completeStatus,
      passkeyDisplayStatus: "not_configured",
    });
    expect(summary.lastUnlockMethod).toBe("Not tracked yet");
  });
});
