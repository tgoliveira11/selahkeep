"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPTED_AUDIO_TYPES } from "@/lib/voice/audio-decode";
import { VOICE_LANGUAGES, isSupportedVoiceLanguage } from "@/lib/voice/voice-languages";
import { useAudioFileTranscription } from "./use-audio-file-transcription";

interface AudioUploadPanelProps {
  /** Insert the (possibly edited) transcript into the note body. */
  onInsert: (text: string) => void;
  onClose: () => void;
}

/** "auto" lets Whisper detect the language; otherwise it's forced. */
type UploadLanguage = "auto" | (typeof VOICE_LANGUAGES)[number]["code"];
const LANG_STORAGE_KEY = "selahkeep:voice:upload-lang";

function readStoredLanguage(): UploadLanguage {
  try {
    const value = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (value === "auto") return "auto";
    return value && isSupportedVoiceLanguage(value) ? value : "auto";
  } catch {
    return "auto";
  }
}

const uploadIcon = (size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
  </svg>
);

/**
 * Upload an audio file and transcribe it fully on-device: Whisper auto-detects
 * the language and (optionally) labels speakers ("[Person one]…"). The result is
 * reviewed/edited before insertion, mirroring the dictation panel. No audio is
 * uploaded. See `docs/TDR_Local_Voice_Notes.md`.
 */
export function AudioUploadPanel({ onInsert, onClose }: AudioUploadPanelProps) {
  const {
    supported,
    status,
    transcript,
    fileName,
    error,
    progress,
    decodeProgress,
    phase,
    transcribeFile,
    reset,
  } = useAudioFileTranscription();
  const [diarize, setDiarize] = useState(true);
  const [language, setLanguage] = useState<UploadLanguage>("auto");
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draft = draftOverride ?? transcript;

  useEffect(() => {
    setLanguage(readStoredLanguage());
  }, []);

  const changeLanguage = useCallback((value: UploadLanguage) => {
    setLanguage(value);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, value);
    } catch {
      /* storage unavailable — keep the in-memory selection */
    }
  }, []);

  const decoding = status === "decoding";
  const transcribing = status === "transcribing";
  const reviewing = status === "ready";
  const erroring = status === "error";
  const idle = !decoding && !transcribing && !reviewing && !erroring;
  const working = decoding || transcribing;
  const pct = Math.round(progress * 100);
  const modelLoading = transcribing && progress > 0 && progress < 1;
  const decodePct = Math.round(decodeProgress * 100);
  const showDecodeBar = decoding && decodeProgress > 0 && decodeProgress < 1;
  // Whisper gives no fine-grained inference %, so transcribe/diarize show an
  // indeterminate (animated) bar — but every processing step shows a status bar.
  const showBusyBar = transcribing && !modelLoading;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!working) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [working]);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file) void transcribeFile(file, diarize, language === "auto" ? undefined : language);
    },
    [transcribeFile, diarize, language]
  );

  const handleInsert = useCallback(() => {
    if (draft.trim()) onInsert(draft);
    reset();
    setDraftOverride(null);
    onClose();
  }, [draft, onInsert, reset, onClose]);

  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]"
      data-testid="audio-upload-panel"
      aria-label="Upload an audio file"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 text-[var(--primary)]">
          {uploadIcon(16)}
          <span className="text-sm font-semibold text-[var(--foreground)]">Upload audio</span>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setDraftOverride(null);
            onClose();
          }}
          className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Close
        </button>
      </div>

      <div className="p-4">
        {!supported ? (
          <Alert variant="warning" role="status">
            Audio file transcription isn&apos;t supported in this browser. You can still type your
            note.
          </Alert>
        ) : erroring ? (
          <div className="space-y-3">
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
            <button
              type="button"
              onClick={() => {
                reset();
                inputRef.current?.click();
              }}
              className="text-sm font-semibold text-[var(--primary)]"
            >
              Try another file
            </button>
          </div>
        ) : idle ? (
          /* PICK A FILE */
          <div>
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--bg-2)] px-4 py-7 text-center"
              data-testid="audio-upload-dropzone"
            >
              <span className="text-[var(--primary)]">{uploadIcon(26)}</span>
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Choose an audio file
              </span>
              <span className="text-[12.5px] text-[var(--muted)]">
                MP3, WAV, M4A, OGG, FLAC… — transcribed on this device
              </span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_AUDIO_TYPES}
                className="sr-only"
                data-testid="audio-upload-input"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>

            <label className="mt-3 flex items-center justify-between gap-2 text-[13px] text-[var(--fg-2)]">
              <span className="font-semibold text-[var(--foreground)]">Language</span>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value as UploadLanguage)}
                data-testid="audio-upload-language"
                className="rounded-md border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs font-semibold text-[var(--fg-2)]"
              >
                <option value="auto">Auto-detect</option>
                {VOICE_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-2.5 flex items-center gap-2.5 text-[13px] text-[var(--fg-2)]">
              <input
                type="checkbox"
                checked={diarize}
                onChange={(e) => setDiarize(e.target.checked)}
                data-testid="audio-upload-diarize"
                className="h-4 w-4 accent-[var(--primary-solid)]"
              />
              <span>
                <span className="font-semibold text-[var(--foreground)]">Separate speakers</span>{" "}
                — label turns as [Person one], [Person two]…
              </span>
            </label>

            <p className="mt-3 text-[12.5px] text-[var(--muted)]" data-testid="audio-upload-privacy">
              {language === "auto"
                ? "The language is detected automatically (pick it above if detection is wrong)."
                : "Transcribing in your selected language."}{" "}
              Everything runs locally — your audio never leaves this device.
            </p>
          </div>
        ) : working ? (
          /* DECODING / TRANSCRIBING */
          <div data-testid="audio-upload-working">
            <div className="flex items-center gap-3 py-1.5">
              <span
                className="inline-block h-[22px] w-[22px] shrink-0 rounded-full border-[2.5px] border-[var(--lilac)] border-t-[var(--primary)]"
                style={{ animation: "selahSpin .8s linear infinite" }}
                aria-hidden="true"
              />
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  {decoding
                    ? "Reading audio file…"
                    : phase === "diarizing"
                      ? "Separating speakers…"
                      : "Transcribing on device…"}
                  {working && (
                    <span className="tabular-nums text-[12.5px] font-semibold text-[var(--primary)]">
                      {elapsed}s
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] text-[var(--muted)]">
                  {decoding
                    ? fileName ?? "Decoding audio"
                    : phase === "diarizing"
                      ? "Labelling who spoke when"
                      : language === "auto"
                        ? "Detecting language and transcribing"
                        : "Transcribing in your selected language"}
                </div>
              </div>
            </div>
            {showDecodeBar && (
              <div className="mt-3" data-testid="audio-upload-decode-progress">
                <div className="mb-1 flex items-center justify-between text-[12px] font-semibold text-[var(--muted)]">
                  <span>Decoding audio</span>
                  <span className="tabular-nums text-[var(--primary)]">{decodePct}%</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-[var(--bg-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary-solid)] transition-[width] duration-200"
                    style={{ width: `${decodePct}%` }}
                  />
                </div>
              </div>
            )}
            {modelLoading && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[12px] font-semibold text-[var(--muted)]">
                  <span>Preparing voice model</span>
                  <span className="tabular-nums text-[var(--primary)]">{pct}%</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-[var(--bg-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary-solid)] transition-[width] duration-200"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
            {showBusyBar && (
              <div className="mt-3" data-testid="audio-upload-busy-bar">
                <div className="h-[7px] overflow-hidden rounded-full bg-[var(--bg-2)]">
                  <div
                    className="h-full w-2/5 rounded-full bg-[var(--primary-solid)]"
                    style={{ animation: "selahWave 1.1s ease-in-out infinite" }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* REVIEW */
          <div data-testid="audio-upload-review">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Review before inserting
            </div>
            <Textarea
              id="audio-upload-transcript"
              aria-label="Review before inserting"
              value={draft}
              onChange={(e) => setDraftOverride(e.target.value)}
              className="min-h-[150px] rounded-[9px] bg-[var(--bg-2)]"
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
                data-testid="audio-upload-insert"
                className="flex-1 rounded-[var(--radius)] bg-[var(--primary-solid)] py-3 text-sm font-semibold text-[var(--on-primary)]"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setDraftOverride(null);
                  inputRef.current?.click();
                }}
                data-testid="audio-upload-redo"
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm font-semibold text-[var(--fg-2)]"
              >
                Another file
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setDraftOverride(null);
                  onClose();
                }}
                data-testid="audio-upload-discard"
                className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-3 text-sm font-semibold text-[var(--muted)]"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

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
