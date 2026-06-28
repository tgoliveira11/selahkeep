"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { requestVaultUnlockAuthenticationOptions } from "@/lib/passkey/vault-unlock-authenticate";

/**
 * Prefetch WebAuthn options so `startAuthentication` can run immediately on tap.
 * Mobile Safari requires the ceremony to start inside the user gesture — fetching
 * options over the network after the click breaks unlock.
 */
export function useVaultPasskeyUnlockPrefetch(enabled: boolean) {
  const [options, setOptions] = useState<PublicKeyCredentialRequestOptionsJSON | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setOptions(null);
      return null;
    }
    try {
      const next = await requestVaultUnlockAuthenticationOptions();
      setOptions(next);
      return next;
    } catch {
      setOptions(null);
      return null;
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { options, refresh };
}
