"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceTranscription } from "./use-voice-transcription";
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

/**
 * On-device dictation panel. Records mic audio, transcribes locally with
 * Whisper (transformers.js), and lets the user review/edit before inserting.
 * No audio or transcript is ever uploaded. See `docs/TDR_Local_Voice_Notes.md`.
 */
export function VoiceCapturePanel({ onInsert, onClose }: VoiceCapturePanelProps) {
  const { supported, status, transcript, error, progress, startRecording, stopRecording, reset } =
    useVoiceTranscription();
  // The panel is client-only (loaded via next/dynamic ssr:false), so reading
  // localStorage in a lazy initializer is safe and avoids setState-in-effect.
  const [language, setLanguage] = useState<VoiceLanguageCode>(() =>
    typeof window === "undefined"
      ? DEFAULT_VOICE_LANGUAGE
      : normalizeVoiceLanguage(window.localStorage.getItem(LANG_STORAGE_KEY))
  );
  // null = follow the latest transcript; string = user has edited the draft.
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

  return (
    <section
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
      data-testid="voice-capture-panel"
      aria-label="Dictate a note"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Dictate a note</h3>
        <button
          type="button"
          className="text-sm text-[var(--muted)] hover:underline"
          onClick={onClose}
          data-testid="voice-close"
        >
          Close
        </button>
      </div>

      <p className="mb-3 text-xs text-[var(--muted)]" data-testid="voice-privacy-note">
        Voice is transcribed on your device. Your audio and words are never uploaded.
      </p>

      {!supported ? (
        <Alert variant="warning" role="status">
          Voice capture is not supported in this browser. You can still type your note.
        </Alert>
      ) : (
        <>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Language</span>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5"
              value={language}
              onChange={(e) => changeLanguage(normalizeVoiceLanguage(e.target.value))}
              disabled={recording || processing}
              data-testid="voice-language-select"
            >
              {VOICE_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {!recording ? (
              <Button
                type="button"
                onClick={() => void startRecording(language)}
                disabled={processing}
                aria-pressed={false}
                data-testid="voice-record"
              >
                {processing ? "Transcribing…" : "Record"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="danger"
                onClick={stopRecording}
                aria-pressed
                data-testid="voice-stop"
              >
                Stop
              </Button>
            )}
            {recording && (
              <span className="text-sm text-[var(--danger)]" role="status" data-testid="voice-recording-indicator">
                ● Recording…
              </span>
            )}
          </div>

          {processing && (
            <p className="mt-3 text-sm text-[var(--muted)]" role="status" aria-live="polite">
              Transcribing on your device…{" "}
              {progress > 0 ? `${Math.round(progress * 100)}%` : "preparing model"}
            </p>
          )}

          {error && (
            <Alert variant="danger" role="alert" className="mt-3">
              {error}
            </Alert>
          )}

          {(status === "ready" || draft) && (
            <div className="mt-3 space-y-2" data-testid="voice-review">
              <label className="block text-sm text-[var(--muted)]" htmlFor="voice-transcript">
                Review before inserting
              </label>
              <Textarea
                id="voice-transcript"
                value={draft}
                onChange={(e) => setDraftOverride(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleInsert} data-testid="voice-insert">
                  Insert into note
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    reset();
                    setDraftOverride(null);
                  }}
                  data-testid="voice-discard"
                >
                  Discard
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
