import type { VaultStatus } from "@/lib/api-client/vault";
import type { PasskeyPrfSupport } from "@/lib/passkey/prf-support";
import { VAULT_INACTIVITY_MS } from "@/lib/crypto-client/vault-session";
import type { VaultSetupPhase } from "@/lib/vault/vault-status";

export type VaultHealthLevel = "strong" | "good" | "needs_attention" | "incomplete";

export type VaultHealthSummary = {
  level: VaultHealthLevel;
  protection: string;
  recovery: string;
  passkeyVaultUnlock: string;
  autoLock: string;
  exportImport: string;
  lastUnlockMethod: string;
};

export type PasskeyVaultUnlockDisplayStatus =
  | "configured"
  | "not_configured"
  | "unavailable_in_browser"
  | "unsupported_in_browser"
  | "unknown_support";

export function derivePasskeyVaultUnlockDisplayStatus(
  hasPasskeyEnvelope: boolean,
  prfProbe: PasskeyPrfSupport | null,
  options?: { managementBlocked?: boolean }
): PasskeyVaultUnlockDisplayStatus {
  if (!hasPasskeyEnvelope) return "not_configured";
  if (options?.managementBlocked) return "unavailable_in_browser";
  if (prfProbe === "unsupported") return "unsupported_in_browser";
  if (prfProbe === "supported") return "configured";
  if (prfProbe === "unknown") return "unknown_support";
  return "configured";
}

export function formatPasskeyVaultUnlockStatus(status: PasskeyVaultUnlockDisplayStatus): string {
  switch (status) {
    case "configured":
      return "Configured";
    case "not_configured":
      return "Not configured";
    case "unavailable_in_browser":
      return "Unavailable in this browser";
    case "unsupported_in_browser":
      return "Unsupported in this browser";
    case "unknown_support":
      return "Unknown support";
  }
}

export function formatAutoLockStatus(): string {
  const minutes = Math.round(VAULT_INACTIVITY_MS / 60_000);
  return `Enabled · ${minutes} minutes`;
}

export function deriveVaultHealthSummary(input: {
  setupPhase: VaultSetupPhase;
  serverStatus: VaultStatus | null;
  passkeyDisplayStatus: PasskeyVaultUnlockDisplayStatus;
}): VaultHealthSummary {
  const { setupPhase, serverStatus, passkeyDisplayStatus } = input;

  if (setupPhase === "not_configured" || setupPhase === "setup_incomplete") {
    return {
      level: "incomplete",
      protection: "Incomplete",
      recovery: "Unknown",
      passkeyVaultUnlock: formatPasskeyVaultUnlockStatus(passkeyDisplayStatus),
      autoLock: formatAutoLockStatus(),
      exportImport: "Not available yet",
      lastUnlockMethod: "Not tracked yet",
    };
  }

  const hasPassword =
    serverStatus?.hasVaultPassword === true ||
    serverStatus?.availableUnlockMethods?.password === true;
  const hasRecovery =
    serverStatus?.hasRecoveryPhrase === true ||
    serverStatus?.availableUnlockMethods?.recoveryPhrase === true;

  const recoveryLabel = hasRecovery
    ? "Configured"
    : serverStatus?.hasRecoveryPhrase === false
      ? "Missing"
      : "Unknown";

  let level: VaultHealthLevel = "good";
  if (!hasPassword || !hasRecovery) {
    level = "needs_attention";
  } else if (
    passkeyDisplayStatus === "configured" ||
    passkeyDisplayStatus === "not_configured" ||
    passkeyDisplayStatus === "unknown_support"
  ) {
    level = hasPassword && hasRecovery ? "strong" : "good";
  }

  if (serverStatus?.recoveryState === "At Risk") {
    level = "needs_attention";
  }

  const protection =
    hasPassword && hasRecovery ? (level === "strong" ? "Strong" : "Good") : "Needs attention";

  return {
    level,
    protection,
    recovery: recoveryLabel,
    passkeyVaultUnlock: formatPasskeyVaultUnlockStatus(passkeyDisplayStatus),
    autoLock: formatAutoLockStatus(),
    exportImport: "Not available yet",
    lastUnlockMethod: "Not tracked yet",
  };
}
