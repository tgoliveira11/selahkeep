"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { VaultStatus } from "@/lib/api-client/vault";
import {
  PASSKEY_LOGIN_PRF_UNAVAILABLE_MESSAGE,
  PASSKEY_LOGIN_VAULT_LOCKED_MESSAGE,
  PASSKEY_LOGIN_VAULT_UNLOCKED_MESSAGE,
  PASSKEY_UNLOCK_DECRYPT_FAILED_MESSAGE,
  PASSKEY_UNLOCK_NO_ENVELOPE_MESSAGE,
  PASSKEY_UNLOCK_PRF_UNAVAILABLE_MESSAGE,
} from "@/lib/passkey/messages";
import { buildPasskeyLoginOutcomeKey } from "@/features/passkey/passkey-login-with-vault-unlock";
import { APP_PASSKEY_SLUG } from "@/lib/passkey/app-slug";

export type LtgUnlockMode = "password" | "recovery_phrase" | "legacy";

function consumePasskeyLoginNotice(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const key = buildPasskeyLoginOutcomeKey(APP_PASSKEY_SLUG);
  const outcome = sessionStorage.getItem(key);
  if (!outcome) return null;
  sessionStorage.removeItem(key);
  if (outcome === "vault-unlocked") return PASSKEY_LOGIN_VAULT_UNLOCKED_MESSAGE;
  if (outcome === "vault-locked") return PASSKEY_LOGIN_VAULT_LOCKED_MESSAGE;
  if (outcome === "prf-unavailable") return PASSKEY_LOGIN_PRF_UNAVAILABLE_MESSAGE;
  return null;
}

interface LtgVaultUnlockPanelProps {
  loading: boolean;
  error: string | null;
  vaultStatus: VaultStatus | null;
  onUnlockPassword: (password: string) => void;
  onUnlockRecoveryPhrase: (phrase: string) => void;
  onUnlockPasskey?: () => void;
  onUnlockLegacyDevice?: () => void;
  onUnlockLegacyRecoveryCode?: (code: string) => void;
  onUnlockLegacyPasskey?: () => void;
}

export function LtgVaultUnlockPanel({
  loading,
  error,
  vaultStatus,
  onUnlockPassword,
  onUnlockRecoveryPhrase,
  onUnlockPasskey,
  onUnlockLegacyDevice,
  onUnlockLegacyRecoveryCode,
  onUnlockLegacyPasskey,
}: LtgVaultUnlockPanelProps) {
  const [mode, setMode] = useState<LtgUnlockMode>("password");
  const [vaultPassword, setVaultPassword] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [legacyRecoveryCode, setLegacyRecoveryCode] = useState("");
  const [passkeyNotice] = useState<string | null>(() => consumePasskeyLoginNotice());

  const isLtg = vaultStatus?.setupComplete ?? false;

  function mapUnlockError(message: string | null): string | null {
    if (!message) return null;
    if (message.includes("not set up to unlock")) return PASSKEY_UNLOCK_NO_ENVELOPE_MESSAGE;
    if (message.includes("PRF support")) return PASSKEY_UNLOCK_PRF_UNAVAILABLE_MESSAGE;
    if (message.includes("Could not decrypt")) return PASSKEY_UNLOCK_DECRYPT_FAILED_MESSAGE;
    return message;
  }

  const displayError = mapUnlockError(error);

  return (
    <Card className="space-y-5 p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Unlock LTG Vault</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Your account is signed in, but your vault stays locked until you enter your vault password
          or recovery phrase.
        </p>
      </div>

      {passkeyNotice && <Alert variant="muted">{passkeyNotice}</Alert>}

      {isLtg && onUnlockPasskey && vaultStatus?.hasPasskey && (
        <Button className="w-full" variant="secondary" disabled={loading} onClick={onUnlockPasskey}>
          {loading ? "Unlocking…" : "Unlock with passkey"}
        </Button>
      )}

      {isLtg && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === "password" ? "primary" : "secondary"}
            className="text-sm"
            onClick={() => setMode("password")}
          >
            Vault password
          </Button>
          <Button
            variant={mode === "recovery_phrase" ? "primary" : "secondary"}
            className="text-sm"
            onClick={() => setMode("recovery_phrase")}
          >
            Recovery phrase
          </Button>
          {(vaultStatus?.hasRecoveryCode || (vaultStatus?.trustedDeviceCount ?? 0) > 0) && (
            <Button
              variant={mode === "legacy" ? "primary" : "secondary"}
              className="text-sm"
              onClick={() => setMode("legacy")}
            >
              Other methods
            </Button>
          )}
        </div>
      )}

      {mode === "password" && isLtg && (
        <>
          <FormField label="Vault password" id="unlock-vault-password">
            <Input
              id="unlock-vault-password"
              type="password"
              autoComplete="current-password"
              value={vaultPassword}
              onChange={(e) => setVaultPassword(e.target.value)}
            />
          </FormField>
          <Button
            className="w-full"
            disabled={loading || !vaultPassword}
            onClick={() => onUnlockPassword(vaultPassword)}
          >
            {loading ? "Unlocking…" : "Unlock vault"}
          </Button>
        </>
      )}

      {mode === "recovery_phrase" && isLtg && (
        <>
          <p className="text-sm text-[var(--muted)]">
            Enter your recovery phrase to restore access to your vault. This does not recover your
            vault password.
          </p>
          <FormField label="Recovery phrase" id="unlock-recovery-phrase">
            <Textarea
              id="unlock-recovery-phrase"
              rows={4}
              value={recoveryPhrase}
              onChange={(e) => setRecoveryPhrase(e.target.value)}
              placeholder="Enter your 12- or 24-word phrase"
            />
          </FormField>
          <Button
            className="w-full"
            disabled={loading || !recoveryPhrase.trim()}
            onClick={() => onUnlockRecoveryPhrase(recoveryPhrase)}
          >
            {loading ? "Unlocking…" : "Recover vault access"}
          </Button>
        </>
      )}

      {mode === "legacy" && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">Legacy unlock methods from an earlier setup.</p>
          {onUnlockLegacyDevice && (
            <Button className="w-full" variant="secondary" disabled={loading} onClick={onUnlockLegacyDevice}>
              Unlock with this device
            </Button>
          )}
          {onUnlockLegacyPasskey && vaultStatus?.hasPasskey && (
            <Button className="w-full" variant="secondary" disabled={loading} onClick={onUnlockLegacyPasskey}>
              Unlock with passkey
            </Button>
          )}
          {onUnlockLegacyRecoveryCode && vaultStatus?.hasRecoveryCode && (
            <>
              <FormField label="Recovery code" id="legacy-recovery-code">
                <Input
                  id="legacy-recovery-code"
                  value={legacyRecoveryCode}
                  onChange={(e) => setLegacyRecoveryCode(e.target.value)}
                />
              </FormField>
              <Button
                className="w-full"
                variant="secondary"
                disabled={loading || !legacyRecoveryCode}
                onClick={() => onUnlockLegacyRecoveryCode(legacyRecoveryCode)}
              >
                Unlock with recovery code
              </Button>
            </>
          )}
        </div>
      )}

      {!isLtg && (
        <div className="space-y-3">
          {onUnlockLegacyDevice && (
            <Button className="w-full" disabled={loading} onClick={onUnlockLegacyDevice}>
              Unlock with this device
            </Button>
          )}
        </div>
      )}

      {displayError && <Alert variant="danger">{displayError}</Alert>}
    </Card>
  );
}
