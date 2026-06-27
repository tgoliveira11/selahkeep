"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { useVoiceModelStatus } from "./use-voice-model-status";

interface AudioUploadButtonProps {
  onClick: () => void;
  testId?: string;
  label?: string;
}

/**
 * Opens the audio-file upload panel. Shows the same model-ready dot as the
 * dictate button (they share the on-device speech model).
 */
export function AudioUploadButton({
  onClick,
  testId,
  label = "Upload audio",
}: AudioUploadButtonProps) {
  const { ready, progress } = useVoiceModelStatus();
  const pct = Math.round(progress * 100);

  const title = ready
    ? "Speech model ready — transcribes on your device"
    : progress > 0
      ? `Loading speech model… ${pct}% — on your device`
      : "Transcribe an audio file on your device (auto language + speaker labels)";

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      title={title}
      aria-label="Upload an audio file to transcribe"
      data-testid={testId}
      className={cn("voice-dictate-btn", ready && "voice-dictate-btn--ready")}
    >
      <span
        aria-hidden
        className={cn(
          "voice-dictate-dot",
          ready ? "voice-dictate-dot--ready" : progress > 0 && "voice-dictate-dot--loading"
        )}
      />
      ⬆ {label}
    </Button>
  );
}
