"use client";

import { useState } from "react";
import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SuccessState } from "@/components/ui/success-state";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import {
  extractPasskeyPrfOutput,
  wrapVaultKeyForPasskey,
} from "@/lib/crypto-client/passkey-vault";
import { apiClient } from "@/lib/api-client/client";
import { passkeysApi } from "@/lib/api-client/passkeys";
import {
  prepareAuthenticationOptions,
  prepareRegistrationOptions,
} from "@/lib/passkey/prepare-webauthn-options";
import { toPasskeyRegistrationErrorMessage } from "@/lib/passkey/webauthn-config";
import {
  getPasskeyPrfDiagnosticHeadline,
  getPasskeyPrfDiagnosticMessage,
  isCeremonyCancellation,
  probePasskeyPrfEnvironmentAsync,
  resolveCeremonyDiagnosticReason,
  resolvePreCeremonyDiagnosticReason,
  shouldBlockPasskeyVaultSetupBeforeCeremony,
  type PasskeyPrfDiagnosticReason,
} from "@/lib/passkey/passkey-prf-diagnostics";
import { setPasskeyLoginHint } from "@/lib/passkey/login-hint";
import {
  PASSKEY_ORPHAN_CREDENTIAL_NOTE,
  PASSKEY_VAULT_REGISTERED_MESSAGE,
  type PasskeySetupOutcome,
} from "@/lib/passkey/messages";

interface PasskeySetupProps {
  userId: string;
  hasPasskey: boolean;
  onStatusChange: () => void;
}

export function PasskeySetup({ userId, hasPasskey, onStatusChange }: PasskeySetupProps) {
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<PasskeySetupOutcome>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticReason, setDiagnosticReason] = useState<PasskeyPrfDiagnosticReason | null>(null);
  const [showOrphanNote, setShowOrphanNote] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  function showDiagnosticOutcome(reason: PasskeyPrfDiagnosticReason, options?: { attemptedRegistration?: boolean }) {
    setOutcome("prf-unavailable");
    setDiagnosticReason(reason);
    setError(null);
    setMessage(getPasskeyPrfDiagnosticMessage(reason));
    setShowOrphanNote(Boolean(options?.attemptedRegistration));
  }

  async function handleRegisterPasskey() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setShowOrphanNote(false);
    setOutcome("idle");
    setDiagnosticReason(null);

    try {
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) {
        throw new Error("Unlock your vault before setting up a passkey.");
      }

      const environment = await probePasskeyPrfEnvironmentAsync();
      if (shouldBlockPasskeyVaultSetupBeforeCeremony(environment)) {
        const reason = resolvePreCeremonyDiagnosticReason(environment)!;
        showDiagnosticOutcome(reason);
        return;
      }

      // Step 1: register the vault-only credential WITHOUT an envelope.
      const options = (await apiClient.post("/api/passkeys/register", {
        action: "options",
        vaultOnly: true,
      })) as PublicKeyCredentialCreationOptionsJSON;

      let attestation;
      try {
        attestation = await startRegistration({
          optionsJSON: prepareRegistrationOptions(options),
        });
      } catch (ceremonyError) {
        if (isCeremonyCancellation(ceremonyError)) {
          setOutcome("cancelled");
          setError(getPasskeyPrfDiagnosticMessage("ceremony_cancelled"));
          return;
        }
        throw ceremonyError;
      }

      const registration = await apiClient.post<{
        verified: boolean;
        credentialId?: string;
        credentialDbId?: string;
      }>("/api/passkeys/register", {
        action: "verify",
        response: attestation,
        vaultOnly: true,
      });

      const credentialDbId = registration.credentialDbId;
      if (!credentialDbId) {
        throw new Error("Passkey registration failed");
      }

      // Step 2: create the envelope from an AUTHENTICATION-ceremony PRF (`get`),
      // matching the unlock ceremony. Registration (`create`) PRF is unreliable on
      // iOS (create vs get can differ), so it is never used to wrap the vault key.
      const enablePath = `/api/account/passkeys/${credentialDbId}/enable-vault-unlock`;
      const enableOptions = (await apiClient.post(enablePath, {
        action: "options",
      })) as PublicKeyCredentialRequestOptionsJSON;

      let assertion;
      try {
        assertion = await startAuthentication({
          optionsJSON: prepareAuthenticationOptions(enableOptions),
        });
      } catch (ceremonyError) {
        if (isCeremonyCancellation(ceremonyError)) {
          setOutcome("cancelled");
          setError(getPasskeyPrfDiagnosticMessage("ceremony_cancelled"));
          return;
        }
        throw ceremonyError;
      }

      const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);

      if (!prfOutput) {
        showDiagnosticOutcome(resolveCeremonyDiagnosticReason({ prfOutputPresent: false }), {
          attemptedRegistration: true,
        });
        return;
      }

      const encryptedVaultKey = await wrapVaultKeyForPasskey(
        vaultKey,
        prfOutput,
        userId,
        userId
      );

      const result = await apiClient.post<{ success?: boolean }>(enablePath, {
        action: "verify",
        response: assertion,
        encryptedVaultKey,
        prfVaultEnvelope: true,
        prfSupported: true,
      });

      if (result.success) {
        setPasskeyLoginHint({
          userId,
          credentialId: registration.credentialId,
        });
        setOutcome("vault-registered");
        setMessage(PASSKEY_VAULT_REGISTERED_MESSAGE);
        onStatusChange();
      }
    } catch (e) {
      if (isCeremonyCancellation(e)) {
        setOutcome("cancelled");
        setError(getPasskeyPrfDiagnosticMessage("ceremony_cancelled"));
        return;
      }
      if (e instanceof Error && e.name === "NotSupportedError") {
        showDiagnosticOutcome("webauthn_unavailable");
        return;
      }
      setOutcome("failed");
      const registrationMessage = toPasskeyRegistrationErrorMessage(e);
      setError(registrationMessage ?? (e instanceof Error ? e.message : "Passkey registration failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovePasskey() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setShowOrphanNote(false);
    setOutcome("idle");

    try {
      await passkeysApi.removeAll();
      setMessage("Passkey removed.");
      onStatusChange();
    } catch (e) {
      setOutcome("failed");
      setError(e instanceof Error ? e.message : "Failed to remove passkey");
    } finally {
      setLoading(false);
      setRemoveOpen(false);
    }
  }

  if (hasPasskey) {
    return (
      <div className="space-y-4">
        <SuccessState message="Passkey is set up. You can unlock your vault on a new device with your passkey." />
        <Button
          onClick={() => setRemoveOpen(true)}
          disabled={loading}
          variant="danger"
          className="w-full sm:w-auto"
        >
          Remove passkey
        </Button>
        {message && <SuccessState message={message} />}
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <ConfirmDialog
          open={removeOpen}
          title="Remove passkey?"
          description="You will no longer be able to unlock your vault with this passkey on new devices."
          confirmLabel="Remove passkey"
          loading={loading}
          onConfirm={handleRemovePasskey}
          onCancel={() => setRemoveOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        When supported by your browser, a passkey lets you unlock your vault with your device PIN,
        fingerprint, or face recognition on a new device.
      </p>
      <Button onClick={handleRegisterPasskey} disabled={loading} variant="secondary" className="w-full sm:w-auto">
        {loading ? "Working…" : "Set up passkey"}
      </Button>
      {outcome === "vault-registered" && message && <SuccessState message={message} />}
      {outcome === "prf-unavailable" && message && diagnosticReason && (
        <Alert variant="warning" title={getPasskeyPrfDiagnosticHeadline(diagnosticReason)}>
          {message}
          {showOrphanNote && (
            <span className="mt-2 block text-[var(--muted)]">{PASSKEY_ORPHAN_CREDENTIAL_NOTE}</span>
          )}
        </Alert>
      )}
      {outcome === "cancelled" && error && (
        <Alert variant="muted">{error}</Alert>
      )}
      {outcome === "failed" && error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
    </div>
  );
}
