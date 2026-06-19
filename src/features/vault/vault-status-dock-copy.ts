import type { VaultClientStatus } from "@/lib/vault/vault-status";

export type VaultStatusDockExpandedCopy = {
  title: string;
  body: string;
  countdownInline: string | null;
};

/** Expanded by default for locked/unlocked only when preference unset; setup states hide the dock. */
export function getDefaultVaultStatusDockExpanded(clientStatus: VaultClientStatus): boolean {
  return false;
}

/** Whether outside-click / Escape auto-collapse applies when expanded. */
export function vaultStatusDockAutoCollapseWhenExpanded(
  clientStatus: VaultClientStatus
): boolean {
  return clientStatus === "locked" || clientStatus === "unlocked";
}

/** Compact label for the header-attached collapsed handle only. */
export function getVaultStatusDockHandleLabel(
  clientStatus: VaultClientStatus,
  countdown: string | null
): string {
  switch (clientStatus) {
    case "unlocked":
      return countdown ?? "Open";
    case "locked":
      return "Vault";
    case "not_configured":
    case "setup_incomplete":
      return "Vault";
  }
}

export function getVaultStatusDockExpandedCopy(
  clientStatus: VaultClientStatus,
  countdown: string | null
): VaultStatusDockExpandedCopy {
  switch (clientStatus) {
    case "unlocked":
      return {
        title: "Vault open",
        body: "",
        countdownInline: countdown ? `Auto-locks in ${countdown}` : null,
      };
    case "locked":
      return {
        title: "Vault closed",
        body: "",
        countdownInline: null,
      };
    case "not_configured":
      return {
        title: "Vault not set up",
        body: "Create your private encrypted vault before writing private notes.",
        countdownInline: null,
      };
    case "setup_incomplete":
      return {
        title: "Setup incomplete",
        body: "Finish setting up your vault before writing private notes.",
        countdownInline: null,
      };
  }
}
