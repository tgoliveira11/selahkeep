"use client";

import { NoteDetailRailCard } from "@/components/notes/note-detail-rail";
import { useVoiceModelStatus } from "@/features/voice/use-voice-model-status";
import { cn } from "@/lib/ui/cn";

interface NoteEditorDictateRailProps {
  onOpen: () => void;
  testId?: string;
}

function micIcon(size: number) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** Collapsed dictate card for the new-note right rail (Stillness mockup). */
export function NoteEditorDictateRail({ onOpen, testId = "new-note-dictate" }: NoteEditorDictateRailProps) {
  const { ready, progress } = useVoiceModelStatus();
  const pct = Math.round(progress * 100);
  const statusLabel = ready
    ? "Voice model ready"
    : progress > 0
      ? `Loading voice model… ${pct}%`
      : "Voice model loads on first use";

  return (
    <NoteDetailRailCard
      title="Dictate"
      testId="new-note-dictate-rail"
      icon={micIcon(14)}
      headerAction={
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--fg-2)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
          English
        </span>
      }
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpen}
          data-testid={testId}
          aria-label="Open dictation"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--primary-solid)] text-[var(--on-primary)]"
        >
          {micIcon(22)}
        </button>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)]">
            <span
              aria-hidden
              className={cn(
                "voice-dictate-dot",
                ready ? "voice-dictate-dot--ready" : progress > 0 && "voice-dictate-dot--loading"
              )}
            />
            {statusLabel}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
            Runs on this device. No audio leaves it.
          </p>
        </div>
      </div>
    </NoteDetailRailCard>
  );
}
