"use client";

import { useState } from "react";
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import {
  extractPasskeyPrfOutput,
  wrapVaultKeyForPasskey,
} from "@/lib/crypto-client/passkey-vault";
import { apiClient } from "@/lib/api-client/client";
import { passkeysApi } from "@/lib/api-client/passkeys";
import { prepareRegistrationOptions } from "@/lib/passkey/prepare-webauthn-options";
import { detectPasskeyPrfSupport } from "@/lib/passkey/prf-support";
import {
  PASSKEY_ORPHAN_CREDENTIAL_NOTE,
  PASSKEY_PRF_UNAVAILABLE_HEADLINE,
  PASSKEY_VAULT_REGISTERED_MESSAGE,
  type PasskeySetupOutcome,
} from "@/lib/passkey/messages";

interface PasskeySetupProps {
  userId: string;
  hasPasskey: boolean;
  onStatusChange: () => void;
}

function isUserCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "NotAllowedError";
}

export function PasskeySetup({ userId, hasPasskey, onStatusChange }: PasskeySetupProps) {
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<PasskeySetupOutcome>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOrphanNote, setShowOrphanNote] = useState(false);

  function showPrfUnavailable(options: { attemptedRegistration: boolean }) {
    setOutcome("prf-unavailable");
    setError(null);
    setMessage(PASSKEY_PRF_UNAVAILABLE_HEADLINE);
    setShowOrphanNote(options.attemptedRegistration);
  }

  async function handleRegisterPasskey() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setShowOrphanNote(false);
    setOutcome("idle");

    try {
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) {
        throw new Error("Vault must be unlocked to set up a passkey");
      }

      const prfSupport = await detectPasskeyPrfSupport();
      if (prfSupport === "unsupported") {
        showPrfUnavailable({ attemptedRegistration: false });
        return;
      }

      const options = (await apiClient.post("/api/passkeys/register", {
        action: "options",
      })) as PublicKeyCredentialCreationOptionsJSON;

      const attestation = await startRegistration({
        optionsJSON: prepareRegistrationOptions(options),
      });
      const prfOutput = extractPasskeyPrfOutput(attestation.clientExtensionResults);

      if (!prfOutput) {
        showPrfUnavailable({ attemptedRegistration: true });
        return;
      }

      const encryptedVaultKey = await wrapVaultKeyForPasskey(
        vaultKey,
        prfOutput,
        userId,
        userId
      );

      const result = await apiClient.post<{ verified: boolean }>("/api/passkeys/register", {
        action: "verify",
        response: attestation,
        encryptedVaultKey,
        prfVaultEnvelope: true,
      });

      if (result.verified) {
        setOutcome("vault-registered");
        setMessage(PASSKEY_VAULT_REGISTERED_MESSAGE);
        onStatusChange();
      }
    } catch (e) {
      if (isUserCancellation(e)) {
        setOutcome("cancelled");
        setError("Passkey setup was cancelled.");
        return;
      }
      if (e instanceof Error && e.name === "NotSupportedError") {
        showPrfUnavailable({ attemptedRegistration: false });
        return;
      }
      setOutcome("failed");
      setError(e instanceof Error ? e.message : "Passkey registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovePasskey() {
    if (
      !confirm(
        "Remove your passkey? You will no longer be able to unlock your vault with it on new devices."
      )
    ) {
      return;
    }

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
    }
  }

  if (hasPasskey) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-green-700">Passkey is set up for vault unlock on this account.</p>
        <Button
          onClick={handleRemovePasskey}
          disabled={loading}
          variant="danger"
          className="w-full"
        >
          {loading ? "Removing..." : "Remove passkey"}
        </Button>
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Use your device PIN, fingerprint, or face recognition to unlock your vault on a new device.
        Passkey-based vault unlock requires PRF support in your browser or passkey provider.
      </p>
      <Button onClick={handleRegisterPasskey} disabled={loading} variant="secondary" className="w-full">
        {loading ? "Working..." : "Set up passkey"}
      </Button>
      {outcome === "vault-registered" && message && (
        <p className="text-sm text-green-700">{message}</p>
      )}
      {outcome === "prf-unavailable" && message && (
        <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
          <p className="text-sm text-[var(--muted)]">{message}</p>
          {showOrphanNote && (
            <p className="text-sm text-[var(--muted)]">{PASSKEY_ORPHAN_CREDENTIAL_NOTE}</p>
          )}
        </div>
      )}
      {outcome === "cancelled" && error && (
        <p className="text-sm text-[var(--muted)]">{error}</p>
      )}
      {outcome === "failed" && error && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}
    </div>
  );
}
