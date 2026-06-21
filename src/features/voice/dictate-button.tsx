"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { useVoiceModelStatus } from "./use-voice-model-status";

interface DictateButtonProps {
  onClick: () => void;
  testId?: string;
  label?: string;
}

/**
 * Opens the dictation panel. Shows a subtle status dot — green once the
 * on-device speech model is fully loaded — and a tooltip with the current
 * download percentage while it is still warming up.
 */
export function DictateButton({ onClick, testId, label = "Dictate" }: DictateButtonProps) {
  const { ready, progress } = useVoiceModelStatus();
  const pct = Math.round(progress * 100);

  const title = ready
    ? "Speech model ready — dictation transcribes instantly, on your device"
    : progress > 0
      ? `Loading speech model… ${pct}% — you can start now; it finishes on your device`
      : "Speech model loads on first use (one-time download, on your device)";

  const ariaLabel = ready
    ? "Dictate a note. Speech model ready."
    : progress > 0
      ? `Dictate a note. Speech model loading ${pct} percent.`
      : "Dictate a note.";

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      data-testid={testId}
      data-model-ready={ready ? "true" : "false"}
      className={cn("voice-dictate-btn", ready && "voice-dictate-btn--ready")}
    >
      <span
        aria-hidden
        className={cn(
          "voice-dictate-dot",
          ready ? "voice-dictate-dot--ready" : progress > 0 && "voice-dictate-dot--loading"
        )}
      />
      🎙 {label}
    </Button>
  );
}
