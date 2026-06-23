"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceTranscription } from "./use-voice-transcription";
import { useVoiceModelStatus } from "./use-voice-model-status";
import {
  VOICE_LANGUAGES,
  DEFAULT_VOICE_LANGUAGE,
  normalizeVoiceLanguage,
  type VoiceLanguageCode,
} from "@/lib/voice/voice-languages";

const LANG_STORAGE_KEY = "selahkeep:voice:lang";

interface VoiceCapturePanelProps {
  /** Insert the (possibly edited) transcript into the note body. */
  onInsert: (text: string) => void;
  onClose: () => void;
}

const WAVE_DELAYS = ["0s", ".12s", ".24s", ".36s", ".48s", ".6s", ".72s", ".4s", ".2s", ".55s"];

/**
 * On-device dictation panel (Stillness hero spec). Records mic audio,
 * transcribes locally with Whisper (transformers.js), and lets the user
 * review/edit before inserting. No audio or transcript is ever uploaded.
 * See `docs/TDR_Local_Voice_Notes.md` and `docs/DESIGN_SYSTEM.md`.
 */
export function VoiceCapturePanel({ onInsert, onClose }: VoiceCapturePanelProps) {
  const { supported, status, transcript, error, progress, startRecording, stopRecording, reset } =
    useVoiceTranscription();
  const model = useVoiceModelStatus();
  const [language, setLanguage] = useState<VoiceLanguageCode>(() =>
    typeof window === "undefined"
      ? DEFAULT_VOICE_LANGUAGE
      : normalizeVoiceLanguage(window.localStorage.getItem(LANG_STORAGE_KEY))
  );
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  const draft = draftOverride ?? transcript;

  const changeLanguage = useCallback((code: VoiceLanguageCode) => {
    setLanguage(code);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_STORAGE_KEY, code);
    }
  }, []);

  const handleInsert = useCallback(() => {
    if (draft.trim()) onInsert(draft);
    reset();
    setDraftOverride(null);
    onClose();
  }, [draft, onInsert, reset, onClose]);

  const recording = status === "recording";
  const processing = status === "processing";
  const reviewing = status === "ready";
  const erroring = status === "error";
  const idle = !recording && !processing && !reviewing && !erroring;
  const modelLoading = progress > 0 && progress < 1 && !model.ready;
  const pct = Math.round(progress * 100);

  // Elapsed seconds counter while the final transcription runs, so the wait
  // always feels accountable (no silent spinner).
  const [elapsed, setElapsed] = useState(0);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!processing) {
      setElapsed(0);
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
      return;
    }
    setElapsed(0);
    elapsedTimer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
  }, [processing]);

  const micIcon = (size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );

  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]"
      data-testid="voice-capture-panel"
      aria-label="Dictate a note"
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 text-[var(--primary)]">
          {micIcon(16)}
          <span className="text-sm font-semibold text-[var(--foreground)]">Dictate</span>
        </div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg-2)]">
          <span className="sr-only">Language</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
          <select
            value={language}
            onChange={(e) => changeLanguage(normalizeVoiceLanguage(e.target.value))}
            disabled={recording || processing}
            data-testid="voice-language-select"
            className="rounded-md border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs font-semibold text-[var(--fg-2)]"
          >
            {VOICE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="p-4">
        {!supported ? (
          <Alert variant="warning" role="status">
            Voice capture is not supported in this browser. You can still type your note.
          </Alert>
        ) : erroring ? (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        ) : idle && modelLoading ? (
          /* LOADING */
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Preparing voice model
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-[var(--primary)]">
                {pct}%
              </span>
            </div>
            <div className="mb-2 h-[7px] overflow-hidden rounded-full bg-[var(--bg-2)]">
              <div
                className="h-full rounded-full bg-[var(--primary-solid)] transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-[var(--muted)]">
              Downloading once so it works offline. This stays on your device.
            </p>
          </div>
        ) : idle ? (
          /* READY */
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void startRecording(language)}
              data-testid="voice-record"
              aria-label="Start recording"
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--primary-solid)] text-[var(--on-primary)]"
            >
              {micIcon(22)}
            </button>
            <div>
              <div className="mb-0.5 flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-[var(--success)]"
                  style={{ animation: "selahReady 2.4s ease-in-out infinite" }}
                  aria-hidden="true"
                />
                <span className="text-[13.5px] font-semibold text-[var(--success)]">
                  {model.ready
                    ? model.backend === "webgpu"
                      ? "Voice model ready · GPU"
                      : "Voice model ready"
                    : "Ready to record"}
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--muted)]" data-testid="voice-privacy-note">
                Runs entirely on this device — no audio leaves it. Tap to start.
              </p>
            </div>
          </div>
        ) : recording ? (
          /* RECORDING */
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--danger)]"
                data-testid="voice-recording-indicator"
              >
                <span
                  className="inline-block h-[9px] w-[9px] rounded-full bg-[var(--danger)]"
                  style={{ animation: "selahPulse 1.6s infinite" }}
                  aria-hidden="true"
                />
                Recording
              </span>
              <div className="flex h-[26px] flex-1 items-center gap-[2px]" aria-hidden="true">
                {WAVE_DELAYS.map((delay, i) => (
                  <span
                    key={i}
                    className="h-full flex-1 origin-center rounded-[2px] bg-[var(--accent)]"
                    style={{ animation: `selahWave .9s ease-in-out infinite`, animationDelay: delay }}
                  />
                ))}
              </div>
            </div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Live transcript
            </div>
            <div
              className="min-h-[54px] whitespace-pre-wrap rounded-[9px] bg-[var(--bg-2)] px-3 py-2.5 text-[14.5px] leading-relaxed text-[var(--foreground)]"
              data-testid="voice-live-preview"
              aria-live="polite"
            >
              {draft || <span className="text-[var(--muted)]">Listening…</span>}
            </div>
            <button
              type="button"
              onClick={stopRecording}
              data-testid="voice-stop"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--danger-bd)] bg-[var(--danger-bg)] py-3 text-sm font-semibold text-[var(--danger)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop
            </button>
          </div>
        ) : processing ? (
          /* TRANSCRIBING */
          <div className="flex items-center gap-3 py-1.5" data-testid="voice-transcribing">
            <span
              className="inline-block h-[22px] w-[22px] shrink-0 rounded-full border-[2.5px] border-[var(--lilac)] border-t-[var(--primary)]"
              style={{ animation: "selahSpin .8s linear infinite" }}
              aria-hidden="true"
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                Transcribing on device…
                <span className="tabular-nums text-[12.5px] font-semibold text-[var(--primary)]">
                  {elapsed}s
                </span>
              </div>
              <div className="text-[12.5px] text-[var(--muted)]">
                Tidying up punctuation and spacing
              </div>
            </div>
          </div>
        ) : (
          /* REVIEW (status === "ready") */
          <div data-testid="voice-review">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Review before inserting
            </div>
            <Textarea
              id="voice-transcript"
              aria-label="Review before inserting"
              value={draft}
              onChange={(e) => setDraftOverride(e.target.value)}
              className="min-h-[110px] rounded-[9px] bg-[var(--bg-2)]"
            />
            <div className="mb-3 mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--muted)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Nothing was sent off your device
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleInsert}
                data-testid="voice-insert"
                className="flex-1 rounded-[var(--radius)] bg-[var(--primary-solid)] py-3 text-sm font-semibold text-[var(--on-primary)]"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => void startRecording(language)}
                data-testid="voice-rerecord"
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm font-semibold text-[var(--fg-2)]"
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setDraftOverride(null);
                  onClose();
                }}
                data-testid="voice-discard"
                className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-3 text-sm font-semibold text-[var(--muted)]"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* encryption reassurance */}
      <div className="flex items-center justify-center gap-1.5 border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted)]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2.2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Encrypted on this device before it&apos;s saved
      </div>
    </section>
  );
}
