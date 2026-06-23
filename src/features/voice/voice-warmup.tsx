"use client";

import { useEffect } from "react";
import { warmUpTranscription } from "./transcription-worker-client";

/**
 * Renders nothing; on mount it schedules a background warm-up of the on-device
 * speech model (download weights + initialize the pipeline) during browser idle
 * time, so the first dictation is instant. Gated by capability/connection and
 * the voice feature flag inside `warmUpTranscription`. See
 * `docs/TDR_Local_Voice_Notes.md`.
 */
export function VoiceWarmup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Prefer idle time, but with a hard timeout so a busy page can't defer the
    // background download indefinitely — it should start shortly after load.
    const ric =
      window.requestIdleCallback ??
      ((cb: () => void, _opts?: { timeout?: number }) =>
        window.setTimeout(cb, 1500) as unknown as number);
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = ric(() => warmUpTranscription(), { timeout: 2500 });
    return () => cancel(id as number);
  }, []);

  return null;
}
