"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { passkeyAccountApi } from "@tgoliveira/secure-auth/client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SuccessState } from "@/components/ui/success-state";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client/client";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import {
  extractPasskeyPrfOutput,
  wrapVaultKeyForPasskey,
} from "@/lib/crypto-client/passkey-vault";
import { prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";
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
import {
  PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE,
  PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE,
  PASSKEY_VAULT_UNLOCK_READONLY_HEADLINE,
  PASSKEY_VAULT_UNLOCK_READONLY_MESSAGE,
  PASSKEY_VAULT_UNLOCK_TEST_SUCCEEDED_MESSAGE,
} from "@/lib/passkey/messages";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

type AccountPasskey = {
  id: string;
  friendlyName: string;
  signInEnabled: boolean;
};

type VaultUnlockStatus = {
  signInEnabled: boolean;
  vaultUnlockEnabled: boolean;
  prfSupported: boolean | null;
  credentialId: string;
};

type PasskeyVaultUnlockSectionState =
  | "not_configured"
  | "configured"
  | "unsupported"
  | "unknown";

interface PasskeyVaultUnlockSetupProps {
  userId: string;
  vaultUnlocked: boolean;
}

async function fetchPasskeyVaultData(): Promise<{
  passkeys: AccountPasskey[];
  statusById: Record<string, VaultUnlockStatus>;
}> {
  const result = await passkeyAccountApi.list();
  const signInPasskeys = result.passkeys.filter((passkey) => passkey.signInEnabled);
  const statuses: Record<string, VaultUnlockStatus> = {};
  await Promise.all(
    signInPasskeys.map(async (passkey) => {
      statuses[passkey.id] = await apiClient.get<VaultUnlockStatus>(
        `/api/account/passkeys/${passkey.id}/vault-unlock`
      );
    })
  );
  return { passkeys: signInPasskeys, statusById: statuses };
}

function deriveSectionState(
  passkeys: AccountPasskey[],
  statusById: Record<string, VaultUnlockStatus>,
  environment: PasskeyPrfEnvironmentSnapshot | null
): { state: PasskeyVaultUnlockSectionState; reason: PasskeyPrfDiagnosticReason | null } {
  const configured = passkeys.some((passkey) => statusById[passkey.id]?.vaultUnlockEnabled);
  if (configured) {
    return { state: "configured", reason: "supported" };
  }

  if (!environment) {
    return { state: "unknown", reason: "unknown" };
  }

  const preCeremonyReason = resolvePreCeremonyDiagnosticReason(environment);
  if (preCeremonyReason === "secure_context_required" || preCeremonyReason === "webauthn_unavailable") {
    return { state: "unsupported", reason: preCeremonyReason };
  }
  if (preCeremonyReason === "unsupported") {
    return { state: "unsupported", reason: "unsupported" };
  }

  return { state: "not_configured", reason: environment.capabilityProbe === "unknown" ? "unknown" : null };
}

export function PasskeyVaultUnlockSetup({ userId, vaultUnlocked }: PasskeyVaultUnlockSetupProps) {
  const [passkeys, setPasskeys] = useState<AccountPasskey[]>([]);
  const [statusById, setStatusById] = useState<Record<string, VaultUnlockStatus>>({});
  const [environment, setEnvironment] = useState<PasskeyPrfEnvironmentSnapshot | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticReason, setDiagnosticReason] = useState<PasskeyPrfDiagnosticReason | null>(null);

  const loadPasskeys = useCallback(async () => {
    const data = await fetchPasskeyVaultData();
    setPasskeys(data.passkeys);
    setStatusById(data.statusById);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPasskeyVaultData(), probePasskeyPrfEnvironmentAsync()])
      .then(([data, env]) => {
        if (!cancelled) {
          setPasskeys(data.passkeys);
          setStatusById(data.statusById);
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

  const section = useMemo(
    () => deriveSectionState(passkeys, statusById, environment),
    [passkeys, statusById, environment]
  );

  async function runEnableCeremony(passkeyId: string) {
    const options = (await apiClient.post(
      `/api/account/passkeys/${passkeyId}/enable-vault-unlock`,
      { action: "options" }
    )) as PublicKeyCredentialRequestOptionsJSON;

    return runCeremonyWithOptions(options);
  }

  async function runTestCeremony(passkeyId: string) {
    const status = statusById[passkeyId];
    const options = (await apiClient.post("/api/passkeys/authenticate", {
      action: "options",
    })) as PublicKeyCredentialRequestOptionsJSON;

    const filteredOptions: PublicKeyCredentialRequestOptionsJSON = {
      ...options,
      allowCredentials: status?.credentialId
        ? [{ id: status.credentialId, type: "public-key" }]
        : options.allowCredentials,
    };

    return runCeremonyWithOptions(filteredOptions);
  }

  async function runCeremonyWithOptions(options: PublicKeyCredentialRequestOptionsJSON) {
    const assertion = await startAuthentication({
      optionsJSON: prepareAuthenticationOptions(options),
    });

    const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);

    return { assertion, prfOutput };
  }

  async function runDisableCeremony(passkeyId: string) {
    const options = (await apiClient.post(
      `/api/account/passkeys/${passkeyId}/vault-unlock`,
      { action: "disable-options" }
    )) as PublicKeyCredentialRequestOptionsJSON;

    return runCeremonyWithOptions(options);
  }

  async function handleEnable(passkeyId: string) {
    setLoadingId(passkeyId);
    setError(null);
    setMessage(null);
    setDiagnosticReason(null);

    try {
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) {
        throw new Error("Unlock your vault before enabling passkey vault unlock.");
      }

      const env = environment ?? (await probePasskeyPrfEnvironmentAsync());
      setEnvironment(env);

      if (shouldBlockPasskeyVaultSetupBeforeCeremony(env)) {
        const reason = resolvePreCeremonyDiagnosticReason(env)!;
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }

      const { assertion, prfOutput } = await runEnableCeremony(passkeyId);

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

      await apiClient.post(`/api/account/passkeys/${passkeyId}/enable-vault-unlock`, {
        action: "verify",
        response: assertion,
        encryptedVaultKey,
        prfVaultEnvelope: true,
        prfSupported: env.capabilityProbe === "supported",
      });

      setMessage(PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE);
      await loadPasskeys();
    } catch (e) {
      if (isCeremonyCancellation(e)) {
        const reason: PasskeyPrfDiagnosticReason = "ceremony_cancelled";
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }
      setError(e instanceof Error ? e.message : "Could not enable passkey vault unlock.");
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
      const env = environment ?? (await probePasskeyPrfEnvironmentAsync());
      setEnvironment(env);

      if (shouldBlockPasskeyVaultSetupBeforeCeremony(env)) {
        const reason = resolvePreCeremonyDiagnosticReason(env)!;
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }

      const { prfOutput } = await runTestCeremony(passkeyId);

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
        const reason: PasskeyPrfDiagnosticReason = "ceremony_cancelled";
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }
      setError(e instanceof Error ? e.message : "Passkey test failed.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReplace(passkeyId: string) {
    setLoadingId(passkeyId);
    setError(null);
    setMessage(null);
    setDiagnosticReason(null);

    try {
      if (isPasskeyPrfManagementBlocked(environment)) {
        setError(PASSKEY_VAULT_UNLOCK_READONLY_MESSAGE);
        return;
      }

      await handleDisable(passkeyId, { skipMessage: true });
      await handleEnable(passkeyId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not replace passkey vault unlock.");
      setLoadingId(null);
    }
  }

  async function handleDisable(passkeyId: string, options?: { skipMessage?: boolean }) {
    setLoadingId(passkeyId);
    if (!options?.skipMessage) {
      setError(null);
      setMessage(null);
      setDiagnosticReason(null);
    }

    try {
      if (isPasskeyPrfManagementBlocked(environment)) {
        setError(PASSKEY_VAULT_UNLOCK_READONLY_MESSAGE);
        return;
      }

      const { assertion } = await runDisableCeremony(passkeyId);

      await apiClient.delete(`/api/account/passkeys/${passkeyId}/vault-unlock`, {
        response: assertion,
        prfVaultEnvelope: true,
      });
      if (!options?.skipMessage) {
        setMessage(PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE);
      }
      await loadPasskeys();
    } catch (e) {
      if (isCeremonyCancellation(e)) {
        const reason: PasskeyPrfDiagnosticReason = "ceremony_cancelled";
        setDiagnosticReason(reason);
        setError(getPasskeyPrfDiagnosticMessage(reason));
        return;
      }
      setError(e instanceof Error ? e.message : "Could not disable passkey vault unlock.");
    } finally {
      setLoadingId(null);
    }
  }

  if (passkeys.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Account passkeys sign you in to SelahKeep. Passkey <strong>vault unlock</strong> is a
          separate optional step that requires browser PRF support.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Add an account passkey in account security settings first, then return here to enable vault
          unlock for it.
        </p>
      </div>
    );
  }

  const managementBlocked = isPasskeyPrfManagementBlocked(environment);
  const showUnknownNotice = section.state === "not_configured" && section.reason === "unknown";

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Account passkeys sign you in to SelahKeep. Passkey <strong>vault unlock</strong> is separate:
        it uses the WebAuthn PRF extension to unwrap your vault on this device after sign-in.
      </p>

      {section.state === "configured" && !managementBlocked && (
        <Alert variant="success" title="Passkey vault unlock configured">
          At least one account passkey can unlock your vault on PRF-capable browsers.
        </Alert>
      )}

      {managementBlocked &&
        passkeys.some((passkey) => statusById[passkey.id]?.vaultUnlockEnabled) && (
          <Alert variant="warning" title={PASSKEY_VAULT_UNLOCK_READONLY_HEADLINE}>
            {PASSKEY_VAULT_UNLOCK_READONLY_MESSAGE}
          </Alert>
        )}

      {section.state === "unsupported" && section.reason && (
        <Alert variant="warning" title={getPasskeyPrfDiagnosticHeadline(section.reason)}>
          {getPasskeyPrfDiagnosticMessage(section.reason)}
        </Alert>
      )}

      {showUnknownNotice && (
        <Alert variant="muted" title={getPasskeyPrfDiagnosticHeadline("unknown")}>
          {getPasskeyPrfDiagnosticMessage("unknown")}
        </Alert>
      )}

      {!vaultUnlocked && !managementBlocked && (
        <Alert variant="warning">
          Unlock your vault to set up, replace, or disable passkey vault unlock.
        </Alert>
      )}

      <ul className="space-y-3">
        {passkeys.map((passkey) => {
          const status = statusById[passkey.id];
          const vaultEnabled = status?.vaultUnlockEnabled ?? false;
          const readOnlyConfigured = vaultEnabled && managementBlocked;
          const canManage = vaultUnlocked && !managementBlocked && section.state !== "unsupported";
          return (
            <li
              key={passkey.id}
              className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium text-[var(--foreground)]">{passkey.friendlyName}</p>
                <p className="text-sm text-[var(--muted)]">Signs you in to your SelahKeep account.</p>
                <Badge variant={vaultEnabled ? "success" : "muted"}>
                  Vault unlock: {vaultEnabled ? "configured" : "not configured"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {!vaultEnabled ? (
                  <Button
                    variant="secondary"
                    disabled={!canManage || loadingId === passkey.id}
                    onClick={() => void handleEnable(passkey.id)}
                  >
                    {loadingId === passkey.id ? "Working…" : "Set up vault unlock"}
                  </Button>
                ) : readOnlyConfigured ? null : (
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
                      onClick={() => void handleReplace(passkey.id)}
                    >
                      Replace
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
