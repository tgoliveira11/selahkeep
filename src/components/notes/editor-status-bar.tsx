export type EditorStatus =
  | "idle"
  | "unsaved"
  | "saving"
  | "saved"
  | "draft-saved";

interface EditorStatusBarProps {
  status: EditorStatus;
  mode: "visual" | "markdown";
}

const STATUS_COPY: Record<EditorStatus, string | null> = {
  idle: null,
  unsaved: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  "draft-saved": "Draft saved on this device",
};

export function EditorStatusBar({ status, mode }: EditorStatusBarProps) {
  const message = STATUS_COPY[status];
  const modeLabel = mode === "visual" ? "Visual editor" : "Markdown source";

  return (
    <div
      className="note-editor-status"
      data-testid="editor-status-bar"
      role="status"
      aria-live="polite"
    >
      <span className="note-editor-status__mode" data-testid="editor-status-mode">
        {modeLabel}
      </span>
      {message ? (
        <span className="note-editor-status__message" data-testid="editor-status-message">
          {message}
        </span>
      ) : (
        <span className="note-editor-status__message note-editor-status__message--muted">
          Encrypted before save
        </span>
      )}
    </div>
  );
}
