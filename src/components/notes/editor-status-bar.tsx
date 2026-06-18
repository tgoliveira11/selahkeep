import { cn } from "@/lib/ui/cn";

export type EditorStatus =
  | "idle"
  | "unsaved"
  | "saving"
  | "saved"
  | "draft-saved"
  | "save-failed";

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
  "save-failed": "Save failed",
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
        <span
          className={cn(
            "note-editor-status__message",
            status === "save-failed" && "note-editor-status__message--danger"
          )}
          data-testid="editor-status-message"
        >
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
