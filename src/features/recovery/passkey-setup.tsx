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

interface PasskeySetupProps {
  userId: string;
  hasPasskey: boolean;
  onStatusChange: () => void;
}

const PRF_UNAVAILABLE_MESSAGE =
  "This browser or passkey provider does not support vault unlock with passkey. Use a recovery code or another trusted device to recover your private letters.";

export function PasskeySetup({ userId, hasPasskey, onStatusChange }: PasskeySetupProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRegisterPasskey() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) {
        throw new Error("Vault must be unlocked to set up a passkey");
      }

      const options = (await apiClient.post("/api/passkeys/register", {
        action: "options",
      })) as PublicKeyCredentialCreationOptionsJSON;

      const attestation = await startRegistration({
        optionsJSON: prepareRegistrationOptions(options),
      });
      const prfOutput = extractPasskeyPrfOutput(attestation.clientExtensionResults);

      if (!prfOutput) {
        setError(PRF_UNAVAILABLE_MESSAGE);
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
        setMessage(
          "Passkey registered. You can unlock your vault on a new device with your passkey."
        );
        onStatusChange();
      }
    } catch (e) {
      if (e instanceof Error && e.name === "NotSupportedError") {
        setError(PRF_UNAVAILABLE_MESSAGE);
      } else {
        setError(e instanceof Error ? e.message : "Passkey registration failed");
      }
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

    try {
      await passkeysApi.removeAll();
      setMessage("Passkey removed.");
      onStatusChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove passkey");
    } finally {
      setLoading(false);
    }
  }

  if (hasPasskey) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-green-700">Passkey is set up for your account.</p>
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
        Your browser must support passkey vault unlock (PRF).
      </p>
      <Button onClick={handleRegisterPasskey} disabled={loading} variant="secondary" className="w-full">
        {loading ? "Working..." : "Set up passkey"}
      </Button>
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
