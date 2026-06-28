interface NoteEditorPausedForVoiceProps {
  testId?: string;
}

/**
 * Placeholder while dictation runs on memory-constrained devices. TipTap/ONNX
 * together can exceed iOS Safari's WASM heap; unmounting the editor frees RAM
 * for the speech model download.
 */
export function NoteEditorPausedForVoice({
  testId = "note-editor-paused-for-voice",
}: NoteEditorPausedForVoiceProps) {
  return (
    <div
      data-testid={testId}
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] px-4 py-8 text-center text-sm leading-relaxed text-[var(--muted)]"
    >
      Editor paused while dictating to free memory on this device. Your note text is kept
      safe.
    </div>
  );
}
