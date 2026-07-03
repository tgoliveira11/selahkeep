"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { apiClient } from "@/lib/api-client/client";
import { requestVaultUnlockAuthenticationOptions } from "@/lib/passkey/vault-unlock-authenticate";
import { resolveActiveVaultUnlockCredentialIdFromList } from "@/lib/passkey/vault-unlock-credential";

export type VaultPasskeyUnlockPrefetch = {
  options: PublicKeyCredentialRequestOptionsJSON;
  credentialId?: string;
};

/**
 * Prefetch WebAuthn options so `startAuthentication` can run immediately on tap.
 * Mobile Safari requires the ceremony to start inside the user gesture — fetching
 * options over the network after the click breaks unlock.
 */
export function useVaultPasskeyUnlockPrefetch(enabled: boolean) {
  const [prefetch, setPrefetch] = useState<VaultPasskeyUnlockPrefetch | null>(null);

  const refresh = useCallback(async (): Promise<VaultPasskeyUnlockPrefetch | null> => {
    if (!enabled) {
      setPrefetch(null);
      return null;
    }
    try {
      const list = await apiClient.get<{
        passkeys: Array<{ credentialId: string; vaultUnlockEnabled: boolean }>;
        activeEnvelopeCredentialId?: string | null;
      }>("/api/passkeys/vault-unlock");
      const credentialId = resolveActiveVaultUnlockCredentialIdFromList(list);
      const options = await requestVaultUnlockAuthenticationOptions(credentialId);
      const next = { options, credentialId };
      setPrefetch(next);
      return next;
    } catch {
      setPrefetch(null);
      return null;
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { prefetch, options: prefetch?.options ?? null, credentialId: prefetch?.credentialId, refresh };
}
