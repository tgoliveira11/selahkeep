"use client";

import { useEffect } from "react";
import { warmUpTranscription } from "./transcription-worker-client";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";

/**
 * Renders nothing; once the vault is unlocked it schedules a background warm-up
 * of the on-device speech model during browser idle time, so the first dictation
 * is instant. It deliberately does NOT warm up while the vault is locked (e.g.
 * on the `/vault/unlock` screen) — voice features are unreachable there, and
 * eagerly loading a multi-MB model on that screen could crash/reload the tab on
 * memory-constrained phones. Capability/connection/device gating lives inside
 * `warmUpTranscription` (mobile loads the model on demand instead). See
 * `docs/TDR_Local_Voice_Notes.md`.
 */
export function VoiceWarmup() {
  const vault = useVaultClientStatus();
  const unlocked = vault.status === "ready" && vault.clientStatus === "unlocked";

  useEffect(() => {
    if (typeof window === "undefined" || !unlocked) return;
    // Prefer idle time, but with a hard timeout so a busy page can't defer the
    // background download indefinitely — it should start shortly after unlock.
    const ric =
      window.requestIdleCallback ??
      ((cb: () => void, _opts?: { timeout?: number }) =>
        window.setTimeout(cb, 1500) as unknown as number);
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = ric(() => warmUpTranscription(), { timeout: 2500 });
    return () => cancel(id as number);
  }, [unlocked]);

  return null;
}
