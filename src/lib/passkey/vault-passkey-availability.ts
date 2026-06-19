import {
  isPasskeyPrfManagementBlocked,
  type PasskeyPrfEnvironmentSnapshot,
} from "@/lib/passkey/passkey-prf-diagnostics";

export type VaultPasskeyAvailability =
  | { state: "available" }
  | { state: "configured"; unavailableInThisBrowser?: boolean }
  | { state: "not_configured" }
  | { state: "vault_locked" }
  | { state: "vault_not_configured" }
  | { state: "browser_unsupported"; reason: "webauthn_unavailable" | "insecure_context" }
  | { state: "prf_unsupported"; reason: "prf_unsupported" | "provider_does_not_report_prf" }
  | { state: "unknown"; reason: "probe_unavailable" | "not_checked" };

export type DeriveVaultPasskeyAvailabilityInput = {
  vaultEnvelopeConfigured: boolean;
  vaultConfigured: boolean;
  vaultUnlocked: boolean;
  environment: PasskeyPrfEnvironmentSnapshot | null;
};

function browserUnsupportedReason(
  environment: PasskeyPrfEnvironmentSnapshot
): VaultPasskeyAvailability | null {
  if (!environment.secureContext) {
    return { state: "browser_unsupported", reason: "insecure_context" };
  }
  if (!environment.webauthnAvailable || !environment.credentialsApiAvailable) {
    return { state: "browser_unsupported", reason: "webauthn_unavailable" };
  }
  return null;
}

/**
 * Vault passkey availability — independent of account/login passkeys.
 * Account session is required to reach settings; pending 2FA is enforced by route guards.
 */
export function deriveVaultPasskeyAvailability(
  input: DeriveVaultPasskeyAvailabilityInput
): VaultPasskeyAvailability {
  const { vaultEnvelopeConfigured, vaultConfigured, vaultUnlocked, environment } = input;

  if (!vaultConfigured) {
    return { state: "vault_not_configured" };
  }

  if (vaultEnvelopeConfigured) {
    const unavailableInThisBrowser = Boolean(
      environment && isPasskeyPrfManagementBlocked(environment)
    );
    return { state: "configured", unavailableInThisBrowser };
  }

  if (!vaultUnlocked) {
    return { state: "vault_locked" };
  }

  if (!environment) {
    return { state: "unknown", reason: "not_checked" };
  }

  const blocked = browserUnsupportedReason(environment);
  if (blocked) {
    return blocked;
  }

  if (environment.capabilityProbe === "unsupported") {
    return { state: "prf_unsupported", reason: "prf_unsupported" };
  }

  if (
    environment.clientCapabilitiesPrf === false &&
    environment.clientCapabilitiesAvailable &&
    environment.capabilityProbe !== "supported"
  ) {
    return { state: "unknown", reason: "probe_unavailable" };
  }

  if (environment.capabilityProbe === "unknown") {
    return { state: "unknown", reason: "probe_unavailable" };
  }

  if (environment.capabilityProbe === "supported") {
    return { state: "available" };
  }

  return { state: "not_configured" };
}

export function canAttemptVaultPasskeySetup(availability: VaultPasskeyAvailability): boolean {
  switch (availability.state) {
    case "available":
    case "not_configured":
    case "unknown":
      return true;
    case "configured":
      return !availability.unavailableInThisBrowser;
    case "vault_locked":
    case "vault_not_configured":
    case "browser_unsupported":
    case "prf_unsupported":
      return false;
  }
}

export function shouldShowVaultPasskeyDestructiveActions(
  availability: VaultPasskeyAvailability,
  vaultEnvelopeOnPasskey: boolean
): boolean {
  if (!vaultEnvelopeOnPasskey) return true;
  if (availability.state === "configured" && availability.unavailableInThisBrowser) {
    return false;
  }
  return availability.state !== "browser_unsupported" && availability.state !== "prf_unsupported";
}
