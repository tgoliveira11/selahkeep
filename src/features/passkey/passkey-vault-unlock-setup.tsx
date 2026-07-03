"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SuccessState } from "@/components/ui/success-state";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client/client";
import { vaultApi } from "@/lib/api-client/vault";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import {
  extractPasskeyPrfOutput,
  wrapVaultKeyForPasskey,
} from "@/lib/crypto-client/passkey-vault";
import {
  runVaultUnlockAuthenticationCeremony,
} from "@/lib/passkey/vault-unlock-authenticate";
import { currentDeviceLabel } from "@/lib/passkey/device-label";
import {
  prepareAuthenticationOptions,
  prepareRegistrationOptions,
} from "@/lib/passkey/prepare-webauthn-options";
import {
  getPasskeyPrfDiagnosticHeadline,
  getPasskeyPrfDiagnosticMessage,
  isCeremonyCancellation,
  probePasskeyPrfEnvironmentAsync,
  resolveCeremonyDiagnosticReason,
  resolvePreCeremonyDiagnosticReason,
  shouldBlockPasskeyVaultSetupBeforeCeremony,
  isPasskeyPrfManagementBlocked,
  type PasskeyPrfDiagnosticReason,
  type PasskeyPrfEnvironmentSnapshot,
} from "@/lib/passkey/passkey-prf-diagnostics";
import { toPasskeyRegistrationErrorMessage } from "@/lib/passkey/webauthn-config";
import {
  PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE,
  PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE,
  PASSKEY_VAULT_UNLOCK_ENABLED_REFRESH_WARNING,
  PASSKEY_VAULT_UNLOCK_TEST_SUCCEEDED_MESSAGE,
} from "@/lib/passkey/messages";
import {
  canAttemptVaultPasskeySetup,
  deriveVaultPasskeyAvailability,
  shouldShowVaultPasskeyDestructiveActions,
  type VaultPasskeyAvailability,
} from "@/lib/passkey/vault-passkey-availability";
import {
  getVaultPasskeyAvailabilityCopy,
  VAULT_PASSKEY_INDEPENDENCE_NOTE,
} from "@/lib/passkey/vault-passkey-availability-messages";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

type VaultUnlockPasskey = {
  id: string;
  friendlyName: string;
  signInEnabled: boolean;
  vaultUnlockEnabled: boolean;
  prfSupported: boolean | null;
  credentialId: string;
};

interface PasskeyVaultUnlockSetupProps {
  userId: string;
  vaultUnlocked: boolean;
  vaultConfigured?: boolean;
}

async function fetchVaultPasskeyData(): Promise<{
  passkeys: VaultUnlockPasskey[];
  serverPasskeyEnvelope: boolean;
  vaultConfigured: boolean;
}> {
  const [vaultUnlock, vaultStatus] = await Promise.all([
    apiClient.get<{
      passkeys: VaultUnlockPasskey[];
      serverEnvelopeConfigured: boolean;
    }>("/api/passkeys/vault-unlock"),
    vaultApi.status().catch(() => null),
  ]);

  const serverPasskeyEnvelope =
    vaultUnlock.serverEnvelopeConfigured ||
    vaultStatus?.availableUnlockMethods?.passkey === true ||
    vaultStatus?.hasPasskey === true;

  return {
    passkeys: vaultUnlock.passkeys,
    serverPasskeyEnvelope,
    vaultConfigured: vaultStatus?.setupComplete === true || vaultStatus?.hasVault === true,
  };
}

export function PasskeyVaultUnlockSetup({
  userId,
  vaultUnlocked,
  vaultConfigured = true,
}: PasskeyVaultUnlockSetupProps) {
  const [passkeys, setPasskeys] = useState<VaultUnlockPasskey[]>([]);
  const [serverPasskeyEnvelope, setServerPasskeyEnvelope] = useState(false);
  const [environment, setEnvironment] = useState<PasskeyPrfEnvironmentSnapshot | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticReason, setDiagnosticReason] = useState<PasskeyPrfDiagnosticReason | null>(null);

  const loadPasskeys = useCallback(async () => {
    const data = await fetchVaultPasskeyData();
    setPasskeys(data.passkeys);
    setServerPasskeyEnvelope(data.serverPasskeyEnvelope);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchVaultPasskeyData(), probePasskeyPrfEnvironmentAsync()])
      .then(([data, env]) => {
        if (!cancelled) {
          setPasskeys(data.passkeys);
          setServerPasskeyEnvelope(data.serverPasskeyEnvelope);
          setEnvironment(env);
        }
      })
      .catch(() => {
        if (!cancelled) setPasskeys([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availability = useMemo(
    (): VaultPasskeyAvailability =>
      deriveVaultPasskeyAvailability({
        vaultEnvelopeConfigured:
          serverPasskeyEnvelope || passkeys.some((passkey) => passkey.vaultUnlockEnabled),
        vaultConfigured,
        vaultUnlocked,
        environment,
      }),
    [passkeys, serverPasskeyEnvelope, vaultConfigured, vaultUnlocked, environment]
  );

  const availabilityCopy = useMemo(
    () => getVaultPasskeyAvailabilityCopy(availability),
    [availability]
  );

  const managementBlocked = isPasskeyPrfManagementBlocked(environment);
  const setupAllowed = canAttemptVaultPasskeySetup(availability);
  const hasVaultPasskey = passkeys.some((passkey) => passkey.vaultUnlockEnabled);
  // Passkey PRF is device-specific for some providers, so vault unlock needs one passkey
  // per device. Keep setup available even after a passkey exists, so the user can add
  // the device they are currently on.
  const showPrimarySetup =
    setupAllowed &&
    vaultUnlocked &&
    !managementBlocked &&
    availability.state !== "browser_unsupported" &&
    availability.state !== "prf_unsupported";

  async function runCeremonyWithOptions(options: PublicKeyCredentialRequestOptionsJSON) {
    const assertion = await startAuthentication({
      optionsJSON: prepareAuthenticationOptions(options),
    });
    const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);
    return { assertion, prfOutput };
  }

  async function handleRegisterVaultPasskey() {
    setLoadingId("register");
    setError(null);
    setMessage(null);
    setDiagnosticReason(null);

    try {
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) {
        throw new Error("Unlock your vault before setting up passkey vault unlock.");
      }

      const env = environment ?? (await probePasskeyPrfEnvironmentAsync());
      setEnvironment(env);

      if (shouldBlockPasskeyVaultSetupBeforeCeremony(env)) {
        const reason = resolvePreCeremonyDiagnosticReason(env)!;
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }

      // Step 1: register the vault-only credential WITHOUT an envelope.
      const options = (await apiClient.post("/api/passkeys/register", {
        action: "options",
        vaultOnly: true,
      })) as PublicKeyCredentialCreationOptionsJSON;

      const attestation = await startRegistration({
        optionsJSON: prepareRegistrationOptions(options),
      });

      const registration = (await apiClient.post("/api/passkeys/register", {
        action: "verify",
        response: attestation,
        vaultOnly: true,
        friendlyName: currentDeviceLabel(),
      })) as { credentialDbId?: string };

      const credentialDbId = registration.credentialDbId;
      if (!credentialDbId) {
        throw new Error("Could not set up passkey vault unlock.");
      }

      // Step 2: create the envelope from an AUTHENTICATION-ceremony PRF (`get`),
      // matching the unlock ceremony. Registration (`create`) PRF is unreliable on
      // iOS (create vs get can return different bytes), so it is never used to wrap.
      const enablePath = `/api/account/passkeys/${credentialDbId}/enable-vault-unlock`;
      const enableOptions = (await apiClient.post(enablePath, {
        action: "options",
      })) as PublicKeyCredentialRequestOptionsJSON;

      const { assertion, prfOutput } = await runCeremonyWithOptions(enableOptions);
      if (!prfOutput) {
        const reason = resolveCeremonyDiagnosticReason({ prfOutputPresent: false });
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }

      const encryptedVaultKey: EncryptedPayload = await wrapVaultKeyForPasskey(
        vaultKey,
        prfOutput,
        userId,
        userId
      );

      await apiClient.post(enablePath, {
        action: "verify",
        response: assertion,
        encryptedVaultKey,
        prfVaultEnvelope: true,
        prfSupported: true,
      });

      setMessage(PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE);
      try {
        await loadPasskeys();
      } catch {
        // Registration and envelope persistence already succeeded. A secondary
        // status refresh must not turn that success into a registration error.
        setMessage(PASSKEY_VAULT_UNLOCK_ENABLED_REFRESH_WARNING);
      }
    } catch (e) {
      if (isCeremonyCancellation(e)) {
        setDiagnosticReason("ceremony_cancelled");
        setError(getPasskeyPrfDiagnosticMessage("ceremony_cancelled"));
        return;
      }
      const registrationMessage = toPasskeyRegistrationErrorMessage(e);
      setError(registrationMessage ?? (e instanceof Error ? e.message : "Could not set up passkey vault unlock."));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleTest(passkeyId: string) {
    setLoadingId(passkeyId);
    setError(null);
    setMessage(null);
    setDiagnosticReason(null);

    try {
      const passkey = passkeys.find((item) => item.id === passkeyId);
      const env = environment ?? (await probePasskeyPrfEnvironmentAsync());
      setEnvironment(env);

      if (shouldBlockPasskeyVaultSetupBeforeCeremony(env)) {
        const reason = resolvePreCeremonyDiagnosticReason(env)!;
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }

      const assertion = await runVaultUnlockAuthenticationCeremony(passkey?.credentialId);
      const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);

      if (!prfOutput) {
        const reason = resolveCeremonyDiagnosticReason({ prfOutputPresent: false });
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }

      setMessage(PASSKEY_VAULT_UNLOCK_TEST_SUCCEEDED_MESSAGE);
      setDiagnosticReason("supported");
    } catch (e) {
      if (isCeremonyCancellation(e)) {
        setDiagnosticReason("ceremony_cancelled");
        setError(getPasskeyPrfDiagnosticMessage("ceremony_cancelled"));
        return;
      }
      setError(e instanceof Error ? e.message : "Passkey test failed.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDisable(passkeyId: string) {
    setLoadingId(passkeyId);
    setError(null);
    setMessage(null);
    setDiagnosticReason(null);

    try {
      if (isPasskeyPrfManagementBlocked(environment)) {
        setError(
          getVaultPasskeyAvailabilityCopy({
            state: "configured",
            unavailableInThisBrowser: true,
          })!.explanation
        );
        return;
      }

      const options = (await apiClient.post(`/api/account/passkeys/${passkeyId}/vault-unlock`, {
        action: "disable-options",
      })) as PublicKeyCredentialRequestOptionsJSON;

      const { assertion } = await runCeremonyWithOptions(options);

      await apiClient.delete(`/api/account/passkeys/${passkeyId}/vault-unlock`, {
        response: assertion,
        prfVaultEnvelope: true,
      });

      setMessage(PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE);
      await loadPasskeys();
    } catch (e) {
      if (isCeremonyCancellation(e)) {
        setDiagnosticReason("ceremony_cancelled");
        setError(getPasskeyPrfDiagnosticMessage("ceremony_cancelled"));
        return;
      }
      setError(e instanceof Error ? e.message : "Could not disable passkey vault unlock.");
    } finally {
      setLoadingId(null);
    }
  }

  const alertVariant =
    availabilityCopy?.variant === "success"
      ? "success"
      : availabilityCopy?.variant === "warning"
        ? "warning"
        : availabilityCopy?.variant === "info"
          ? "info"
          : "muted";

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--muted)]">{VAULT_PASSKEY_INDEPENDENCE_NOTE}</p>

      {availabilityCopy && (
        <Alert variant={alertVariant} title={availabilityCopy.headline}>
          {availabilityCopy.explanation}
        </Alert>
      )}

      {showPrimarySetup && (
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={loadingId === "register"}
          onClick={() => void handleRegisterVaultPasskey()}
        >
          {loadingId === "register"
            ? "Working…"
            : hasVaultPasskey
              ? "Add a passkey for this device"
              : "Set up passkey vault unlock"}
        </Button>
      )}

      {hasVaultPasskey && showPrimarySetup && (
        <p className="text-sm text-[var(--muted)]">
          Passkey unlock is per device. Add a passkey on each device you want to unlock
          with — a passkey set up on one device may not unlock the vault on another.
        </p>
      )}

      {passkeys.length > 0 && (
        <ul className="space-y-3">
          {passkeys.map((passkey) => {
            const readOnlyConfigured =
              passkey.vaultUnlockEnabled &&
              !shouldShowVaultPasskeyDestructiveActions(availability, passkey.vaultUnlockEnabled);
            const canManage =
              vaultUnlocked &&
              !managementBlocked &&
              setupAllowed &&
              availability.state !== "browser_unsupported" &&
              availability.state !== "prf_unsupported";
            return (
              <li
                key={passkey.id}
                className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-[var(--foreground)]">{passkey.friendlyName}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {passkey.signInEnabled
                      ? "Also used for account passkey sign-in."
                      : "Vault unlock passkey only — not used for account sign-in."}
                  </p>
                  <Badge variant="success">Vault unlock: configured</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {readOnlyConfigured ? null : (
                    <>
                      <Button
                        variant="secondary"
                        disabled={loadingId === passkey.id}
                        onClick={() => void handleTest(passkey.id)}
                      >
                        {loadingId === passkey.id ? "Working…" : "Test"}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={!canManage || loadingId === passkey.id}
                        onClick={() => void handleDisable(passkey.id)}
                      >
                        Disable
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {passkeys.length === 0 && serverPasskeyEnvelope && (
        <p className="text-sm text-[var(--muted)]">
          A passkey vault unlock envelope exists on your account. Use a PRF-compatible browser where
          it was configured, or unlock with your vault password or recovery phrase.
        </p>
      )}

      {message && <SuccessState message={message} />}
      {error && (
        <Alert
          variant="danger"
          role="alert"
          title={diagnosticReason ? getPasskeyPrfDiagnosticHeadline(diagnosticReason) : undefined}
        >
          {error}
        </Alert>
      )}
    </div>
  );
}
