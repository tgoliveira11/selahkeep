"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { VaultStatus } from "@/lib/api-client/vault";
import { mapVaultUnlockError } from "@/features/vault/vault-unlock-errors";
import { PRODUCT_NAME } from "@/lib/marketing/brand";
import { cn } from "@/lib/ui/cn";

export type LtgUnlockMode = "password" | "recovery_phrase" | "legacy";

interface LtgVaultUnlockPanelProps {
  loading: boolean;
  error: string | null;
  vaultStatus: VaultStatus | null;
  layout?: "page" | "dock";
  idPrefix?: string;
  onUnlockPassword: (password: string) => void | Promise<void>;
  onUnlockRecoveryPhrase: (phrase: string) => void | Promise<void>;
  onUnlockPasskey?: () => void | Promise<void>;
  onUnlockLegacyRecoveryCode?: (code: string) => void | Promise<void>;
  onUnlockLegacyPasskey?: () => void | Promise<void>;
}

export function LtgVaultUnlockPanel({
  loading,
  error,
  vaultStatus,
  layout = "page",
  idPrefix = "unlock",
  onUnlockPassword,
  onUnlockRecoveryPhrase,
  onUnlockPasskey,
  onUnlockLegacyRecoveryCode,
  onUnlockLegacyPasskey,
}: LtgVaultUnlockPanelProps) {
  const [mode, setMode] = useState<LtgUnlockMode>("password");
  const [vaultPassword, setVaultPassword] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [legacyRecoveryCode, setLegacyRecoveryCode] = useState("");
  const isDock = layout === "dock";
  const isLtg = vaultStatus?.setupComplete ?? false;

  const displayError = mapVaultUnlockError(error);
  const showLegacy = vaultStatus?.hasRecoveryCode ?? false;
  const passkeyVaultUnlockAvailable =
    vaultStatus?.availableUnlockMethods?.passkey ?? vaultStatus?.hasPasskey ?? false;

  async function submitPassword() {
    try {
      await onUnlockPassword(vaultPassword);
      setVaultPassword("");
    } catch {
      // Error surfaced via error prop; keep dock expanded.
    }
  }

  async function submitRecoveryPhrase() {
    try {
      await onUnlockRecoveryPhrase(recoveryPhrase);
      setRecoveryPhrase("");
    } catch {
      // Error surfaced via error prop.
    }
  }

  async function submitLegacyRecoveryCode() {
    if (!onUnlockLegacyRecoveryCode) return;
    try {
      await onUnlockLegacyRecoveryCode(legacyRecoveryCode);
      setLegacyRecoveryCode("");
    } catch {
      // Error surfaced via error prop.
    }
  }

  async function submitPasskey(handler?: () => void | Promise<void>) {
    if (!handler) return;
    try {
      await handler();
    } catch {
      // Error surfaced via error prop.
    }
  }

  const passwordId = `${idPrefix}-vault-password`;
  const phraseId = `${idPrefix}-recovery-phrase`;
  const legacyId = `${idPrefix}-legacy-recovery-code`;

  const content = (
    <div className={cn(isDock ? "vault-dock-unlock space-y-3" : "space-y-5")}>
      {!isDock && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Unlock {PRODUCT_NAME}</h2>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Your account is signed in, but your vault stays locked until you enter your vault
            password or recovery phrase. Account passkey sign-in is separate from passkey vault
            unlock.
          </p>
        </div>
      )}

      {isLtg && onUnlockPasskey && passkeyVaultUnlockAvailable && (
        <Button
          className={isDock ? "w-full text-sm" : "w-full"}
          variant="secondary"
          disabled={loading}
          onClick={() => submitPasskey(onUnlockPasskey)}
        >
          {loading ? "Unlocking…" : "Unlock with passkey"}
        </Button>
      )}

      {isLtg && !isDock && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Unlock method">
          <Button
            variant={mode === "password" ? "primary" : "secondary"}
            className="text-sm"
            role="tab"
            aria-selected={mode === "password"}
            onClick={() => setMode("password")}
          >
            Vault password
          </Button>
          <Button
            variant={mode === "recovery_phrase" ? "primary" : "secondary"}
            className="text-sm"
            role="tab"
            aria-selected={mode === "recovery_phrase"}
            onClick={() => setMode("recovery_phrase")}
          >
            Recovery phrase
          </Button>
          {showLegacy && (
            <Button
              variant={mode === "legacy" ? "primary" : "secondary"}
              className="text-sm"
              role="tab"
              aria-selected={mode === "legacy"}
              onClick={() => setMode("legacy")}
            >
              Recovery code
            </Button>
          )}
        </div>
      )}

      {mode === "password" && isLtg && (
        <>
          <FormField label="Vault password" id={passwordId}>
            <Input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              value={vaultPassword}
              onChange={(e) => setVaultPassword(e.target.value)}
            />
          </FormField>
          <Button className="w-full" disabled={loading || !vaultPassword} onClick={submitPassword}>
            {loading ? "Unlocking…" : "Unlock vault"}
          </Button>
        </>
      )}

      {mode === "recovery_phrase" && isLtg && (
        <>
          {!isDock && (
            <p className="text-sm text-[var(--muted)]">
              Enter your recovery phrase to restore access to your vault. This does not recover your
              vault password.
            </p>
          )}
          <FormField label="Recovery phrase" id={phraseId}>
            <Textarea
              id={phraseId}
              rows={isDock ? 3 : 4}
              value={recoveryPhrase}
              onChange={(e) => setRecoveryPhrase(e.target.value)}
              placeholder="Enter your 12- or 24-word phrase"
            />
          </FormField>
          <Button
            className="w-full"
            disabled={loading || !recoveryPhrase.trim()}
            onClick={submitRecoveryPhrase}
          >
            {loading ? "Unlocking…" : "Recover vault access"}
          </Button>
        </>
      )}

      {mode === "legacy" && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">Legacy recovery code from an earlier setup.</p>
          {onUnlockLegacyPasskey && passkeyVaultUnlockAvailable && (
            <Button
              className="w-full"
              variant="secondary"
              disabled={loading}
              onClick={() => submitPasskey(onUnlockLegacyPasskey)}
            >
              Unlock with passkey
            </Button>
          )}
          {onUnlockLegacyRecoveryCode && vaultStatus?.hasRecoveryCode && (
            <>
              <FormField label="Recovery code" id={legacyId}>
                <Input
                  id={legacyId}
                  value={legacyRecoveryCode}
                  onChange={(e) => setLegacyRecoveryCode(e.target.value)}
                />
              </FormField>
              <Button
                className="w-full"
                variant="secondary"
                disabled={loading || !legacyRecoveryCode}
                onClick={submitLegacyRecoveryCode}
              >
                Unlock with recovery code
              </Button>
            </>
          )}
        </div>
      )}

      {displayError && (
        <Alert variant="danger" role="alert">
          {displayError}
        </Alert>
      )}
    </div>
  );

  if (isDock) {
    return content;
  }

  return <Card className="p-6">{content}</Card>;
}
