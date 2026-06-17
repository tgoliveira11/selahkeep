import type { VaultStatus } from "@/lib/api-client/vault";

/** Server-side vault configuration phase (does not include client unlock state). */
export type VaultSetupPhase = "not_configured" | "setup_incomplete" | "complete";

/** Combined server setup phase + client UVK session for product UI. */
export type VaultClientStatus = "not_configured" | "setup_incomplete" | "locked" | "unlocked";

export type VaultUnlockMethods = {
  password: boolean;
  recoveryPhrase: boolean;
  passkey: boolean;
};

export type NormalizedVaultStatus = {
  hasVault: boolean;
  setupComplete: boolean;
  unlocked: boolean;
  status: VaultClientStatus;
  setupPhase: VaultSetupPhase;
  availableUnlockMethods?: VaultUnlockMethods;
};

export function deriveSetupPhase(
  status: Pick<
    VaultStatus,
    | "initialized"
    | "vaultVersion"
    | "ltgSetupComplete"
    | "hasEncryptedSettings"
    | "hasEncryptedIndex"
    | "methods"
  >
): VaultSetupPhase {
  if (!status.initialized) {
    return "not_configured";
  }

  if (status.vaultVersion === "vault-v2") {
    const ltgReady =
      status.ltgSetupComplete === true &&
      status.hasEncryptedSettings === true &&
      status.hasEncryptedIndex === true;
    return ltgReady ? "complete" : "setup_incomplete";
  }

  if (status.methods && status.methods.length > 0) {
    return "complete";
  }

  return "setup_incomplete";
}

export function deriveClientStatus(
  setupPhase: VaultSetupPhase,
  vaultUnlocked: boolean
): VaultClientStatus {
  if (setupPhase === "not_configured") return "not_configured";
  if (setupPhase === "setup_incomplete") return "setup_incomplete";
  return vaultUnlocked ? "unlocked" : "locked";
}

export function deriveClientStatusFromServer(
  status: VaultStatus,
  vaultUnlocked: boolean
): VaultClientStatus {
  return deriveClientStatus(deriveSetupPhase(status), vaultUnlocked);
}

export function normalizeVaultStatus(
  status: VaultStatus,
  vaultUnlocked: boolean
): NormalizedVaultStatus {
  const setupPhase = status.setupPhase ?? deriveSetupPhase(status);
  const setupComplete = setupPhase === "complete";
  const clientStatus = deriveClientStatus(setupPhase, vaultUnlocked);

  return {
    hasVault: status.hasVault ?? status.initialized,
    setupComplete,
    unlocked: clientStatus === "unlocked",
    status: clientStatus,
    setupPhase,
    availableUnlockMethods: status.availableUnlockMethods,
  };
}

export type VaultStatusCopy = {
  badgeLabel: string;
  actionLabel: string;
  actionHref: string;
  promptTitle: string;
  promptDescription: string;
  promptCta: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

export function getVaultStatusCopy(
  clientStatus: VaultClientStatus,
  context: "default" | "settings" | "unlock" | "notes" = "default"
): VaultStatusCopy {
  switch (clientStatus) {
    case "not_configured":
      if (context === "unlock") {
        return {
          badgeLabel: "Vault not set up",
          actionLabel: "Set up vault",
          actionHref: "/vault/setup",
          promptTitle: "Set up your vault first",
          promptDescription:
            "Your account is ready, but you have not created your private vault yet. LTG Vault protects your notes separately from your account login. Create your vault, choose a vault password, and save your recovery phrase before writing private notes.",
          promptCta: "Set up vault",
          secondaryCtaLabel: "Go to notes",
          secondaryCtaHref: "/notes",
        };
      }
      if (context === "settings") {
        return {
          badgeLabel: "Vault not set up",
          actionLabel: "Set up vault",
          actionHref: "/vault/setup",
          promptTitle: "Set up your vault",
          promptDescription:
            "You need to create your private vault before you can manage vault settings. Your vault protects your notes, categories, tags, and recovery options separately from your account login.",
          promptCta: "Set up vault",
        };
      }
      return {
        badgeLabel: "Vault not set up",
        actionLabel: "Set up vault",
        actionHref: "/vault/setup",
        promptTitle: "Set up your vault to start writing",
        promptDescription:
          "Your private notes live inside an encrypted vault. Create your vault first, then you can start writing, organizing, and searching your notes.",
        promptCta: "Set up your vault",
        secondaryCtaLabel: "Learn about vault protection",
        secondaryCtaHref: "/vault/settings",
      };
    case "setup_incomplete":
      if (context === "unlock") {
        return {
          badgeLabel: "Vault setup incomplete",
          actionLabel: "Continue setup",
          actionHref: "/vault/setup",
          promptTitle: "Complete your vault setup",
          promptDescription:
            "Your vault setup is not finished yet. Complete setup before unlocking your private notes.",
          promptCta: "Continue setup",
        };
      }
      if (context === "settings") {
        return {
          badgeLabel: "Vault setup incomplete",
          actionLabel: "Continue setup",
          actionHref: "/vault/setup",
          promptTitle: "Complete your vault setup",
          promptDescription:
            "Your vault setup is not finished yet. Complete it before managing vault settings.",
          promptCta: "Continue setup",
        };
      }
      return {
        badgeLabel: "Vault setup incomplete",
        actionLabel: "Continue setup",
        actionHref: "/vault/setup",
        promptTitle: "Complete your vault setup",
        promptDescription: "Finish setting up your vault before creating notes.",
        promptCta: "Continue setup",
      };
    case "locked":
      if (context === "settings") {
        return {
          badgeLabel: "Vault locked",
          actionLabel: "Unlock vault",
          actionHref: "/vault/unlock",
          promptTitle: "Unlock your vault",
          promptDescription:
            "Unlock your vault to manage settings for your private notes.",
          promptCta: "Unlock vault",
        };
      }
      return {
        badgeLabel: "Vault locked",
        actionLabel: "Unlock vault",
        actionHref: "/vault/unlock",
        promptTitle: "Unlock your vault to view your notes",
        promptDescription:
          "Unlock with your vault password, recovery phrase, or passkey to access your private notes on this browser.",
        promptCta: "Unlock vault",
      };
    case "unlocked":
      return {
        badgeLabel: "Vault unlocked",
        actionLabel: "Lock vault",
        actionHref: "/notes",
        promptTitle: "Your vault is already unlocked",
        promptDescription: "Your vault is unlocked on this browser.",
        promptCta: "Go to notes",
        secondaryCtaHref: "/notes",
      };
  }
}
