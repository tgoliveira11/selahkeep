"use client";

import { useCallback, useEffect, useState } from "react";
import {
  startRegistration,
  startAuthentication,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { passkeyAccountApi, type AccountPasskey } from "@/lib/api-client/passkey-account";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { SuccessState } from "@/components/ui/success-state";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import {
  extractPasskeyPrfOutput,
  wrapVaultKeyForPasskey,
} from "@/lib/crypto-client/passkey-vault";
import { prepareRegistrationOptions, prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";
import { detectPasskeyPrfSupport } from "@/lib/passkey/prf-support";
import { isVaultRecoveryPasskey } from "@/lib/passkey/credential-label";
import { setPasskeyLoginHint } from "@/lib/passkey/login-hint";

interface PasskeySettingsProps {
  userId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isUserCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "NotAllowedError";
}

export function PasskeySettings({ userId }: PasskeySettingsProps) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<AccountPasskey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AccountPasskey | null>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [prfSupport, setPrfSupport] = useState<"unknown" | "supported" | "unsupported">("unknown");

  const loadPasskeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await passkeyAccountApi.list();
      setPasskeys(result.passkeys);
      setVaultUnlocked(Boolean(getSessionVaultKey()));
      const support = await detectPasskeyPrfSupport();
      setPrfSupport(support === "unsupported" ? "unsupported" : "supported");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load passkeys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPasskeys();
  }, [loadPasskeys]);

  async function handleRegisterPasskey() {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const options = (await passkeyAccountApi.registerOptions()) as PublicKeyCredentialCreationOptionsJSON;
      const attestation = await startRegistration({
        optionsJSON: prepareRegistrationOptions(options),
      });

      const result = await passkeyAccountApi.registerVerify({
        response: attestation,
      });

      if (result.verified) {
        setPasskeyLoginHint({ userId, credentialId: result.credentialId });
        setSuccess("Passkey added for sign-in.");
        await loadPasskeys();
      }
    } catch (e) {
      if (isUserCancellation(e)) {
        setError("Passkey registration was cancelled.");
      } else {
        setError(e instanceof Error ? e.message : "Passkey registration failed");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnableVaultUnlock(passkey: AccountPasskey) {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) {
        throw new Error("Unlock your vault before linking this passkey to your private letters.");
      }

      if (prfSupport === "unsupported") {
        setError(
          "This passkey can sign you in, but this browser or passkey provider cannot use it to unlock your private letters."
        );
        return;
      }

      const options = (await passkeyAccountApi.enableVaultUnlockOptions(
        passkey.id
      )) as PublicKeyCredentialRequestOptionsJSON;

      const assertion = await startAuthentication({
        optionsJSON: prepareAuthenticationOptions(options),
      });
      const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);

      if (!prfOutput) {
        setError(
          "This passkey can sign you in, but this browser or passkey provider cannot use it to unlock your private letters."
        );
        return;
      }

      const encryptedVaultKey = await wrapVaultKeyForPasskey(vaultKey, prfOutput, userId, userId);

      await passkeyAccountApi.enableVaultUnlockVerify(passkey.id, {
        response: assertion,
        encryptedVaultKey,
        prfVaultEnvelope: true,
        prfSupported: true,
      });

      setPasskeyLoginHint({ userId, credentialId: assertion.id });
      setSuccess("This passkey can now unlock your private letters on supported devices.");
      await loadPasskeys();
    } catch (e) {
      if (isUserCancellation(e)) {
        setError("Passkey verification was cancelled.");
      } else {
        setError(e instanceof Error ? e.message : "Could not enable vault unlock for this passkey");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemovePasskey() {
    if (!removeTarget) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await passkeyAccountApi.remove(removeTarget.id);
      setSuccess("Passkey removed.");
      setRemoveTarget(null);
      await loadPasskeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove passkey");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="mb-8">
        <LoadingState label="Loading passkeys" />
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Passkeys sign you in with your device verification. A passkey can also unlock your private
          letters only when it is set up for vault unlock on a supported browser.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {passkeys.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No passkeys registered yet.</p>
        ) : (
          <ul className="space-y-3">
            {passkeys.map((passkey) => (
              <li
                key={passkey.id}
                className="rounded-lg border border-[var(--border)] p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="font-medium">{passkey.friendlyName}</p>
                    <Badge variant={passkey.vaultUnlockEnabled ? "success" : "muted"}>
                      {passkey.capabilityLabel}
                    </Badge>
                    <dl className="grid gap-1 text-[var(--muted)]">
                      <div>
                        <dt className="inline">Created: </dt>
                        <dd className="inline">{formatDate(passkey.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="inline">Last used: </dt>
                        <dd className="inline">{formatDate(passkey.lastUsedAt)}</dd>
                      </div>
                    </dl>
                    {!isVaultRecoveryPasskey(passkey) && (
                      <p className="text-[var(--muted)]">
                        This passkey is not set up to unlock your private letters.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {!passkey.vaultUnlockEnabled && vaultUnlocked && prfSupport === "supported" && (
                      <Button
                        variant="secondary"
                        disabled={actionLoading}
                        onClick={() => void handleEnableVaultUnlock(passkey)}
                      >
                        Use this passkey to unlock your private letters
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      disabled={actionLoading}
                      onClick={() => setRemoveTarget(passkey)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button
          variant="secondary"
          disabled={actionLoading}
          onClick={() => void handleRegisterPasskey()}
          className="w-full sm:w-auto"
        >
          {actionLoading ? "Working…" : "Add passkey for sign-in"}
        </Button>

        {success && <SuccessState message={success} />}
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove passkey?"
        description="You will no longer be able to sign in with this passkey. If it unlocked your private letters, that access is removed too."
        confirmLabel="Remove passkey"
        loading={actionLoading}
        onConfirm={() => void handleRemovePasskey()}
        onCancel={() => setRemoveTarget(null)}
      />
    </Card>
  );
}
