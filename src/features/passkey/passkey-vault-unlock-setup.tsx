"use client";

import { useCallback, useEffect, useState } from "react";
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
import { detectPasskeyPrfSupport } from "@/lib/passkey/prf-support";
import {
  PASSKEY_PRF_UNAVAILABLE_HEADLINE,
  PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE,
  PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE,
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

export function PasskeyVaultUnlockSetup({ userId, vaultUnlocked }: PasskeyVaultUnlockSetupProps) {
  const [passkeys, setPasskeys] = useState<AccountPasskey[]>([]);
  const [statusById, setStatusById] = useState<Record<string, VaultUnlockStatus>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPasskeys = useCallback(async () => {
    const data = await fetchPasskeyVaultData();
    setPasskeys(data.passkeys);
    setStatusById(data.statusById);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPasskeyVaultData()
      .then((data) => {
        if (!cancelled) {
          setPasskeys(data.passkeys);
          setStatusById(data.statusById);
        }
      })
      .catch(() => {
        if (!cancelled) setPasskeys([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable(passkeyId: string) {
    setLoadingId(passkeyId);
    setError(null);
    setMessage(null);

    try {
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) {
        throw new Error("Unlock your vault before enabling passkey vault unlock.");
      }

      const prfSupport = await detectPasskeyPrfSupport();
      if (prfSupport === "unsupported") {
        setError(PASSKEY_PRF_UNAVAILABLE_HEADLINE);
        return;
      }

      const options = (await apiClient.post(
        `/api/account/passkeys/${passkeyId}/enable-vault-unlock`,
        { action: "options" }
      )) as PublicKeyCredentialRequestOptionsJSON;

      const assertion = await startAuthentication({
        optionsJSON: prepareAuthenticationOptions(options),
      });
      const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);
      if (!prfOutput) {
        setError(PASSKEY_PRF_UNAVAILABLE_HEADLINE);
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
        prfSupported: prfSupport === "supported",
      });

      setMessage(PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE);
      await loadPasskeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable passkey vault unlock.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDisable(passkeyId: string) {
    setLoadingId(passkeyId);
    setError(null);
    setMessage(null);

    try {
      await apiClient.delete(`/api/account/passkeys/${passkeyId}/vault-unlock`);
      setMessage(PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE);
      await loadPasskeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable passkey vault unlock.");
    } finally {
      setLoadingId(null);
    }
  }

  if (passkeys.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Add an account passkey in security settings first, then you can enable vault unlock for it
        here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Account passkeys sign you in. Optionally, use the same passkey to unlock your vault after
        sign-in when your browser supports it.
      </p>
      {!vaultUnlocked && (
        <Alert variant="warning">
          Unlock your vault to enable passkey vault unlock on an account passkey.
        </Alert>
      )}
      <ul className="space-y-3">
        {passkeys.map((passkey) => {
          const status = statusById[passkey.id];
          const vaultEnabled = status?.vaultUnlockEnabled ?? false;
          return (
            <li
              key={passkey.id}
              className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium text-[var(--foreground)]">{passkey.friendlyName}</p>
                <p className="text-sm text-[var(--muted)]">This passkey can sign you in.</p>
                <Badge variant={vaultEnabled ? "success" : "muted"}>
                  Vault unlock: {vaultEnabled ? "enabled" : "not enabled"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {!vaultEnabled ? (
                  <Button
                    variant="secondary"
                    disabled={!vaultUnlocked || loadingId === passkey.id}
                    onClick={() => void handleEnable(passkey.id)}
                  >
                    {loadingId === passkey.id ? "Working…" : "Use this passkey to unlock your vault too"}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={loadingId === passkey.id}
                    onClick={() => void handleDisable(passkey.id)}
                  >
                    {loadingId === passkey.id ? "Working…" : "Disable vault unlock"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {message && <SuccessState message={message} />}
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
    </div>
  );
}
