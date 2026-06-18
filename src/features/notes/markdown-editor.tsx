"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MarkdownExpertEditor } from "@/features/notes/markdown-expert-editor";
import { VisualNoteEditor } from "@/features/notes/visual-note-editor";
import { getMarkdownConversionWarning } from "@/lib/notes/markdown-roundtrip";

export type NoteEditorMode = "visual" | "markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
  onSave?: () => void;
  checklistsDisabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  maxLength = 50_000,
  id = "note-markdown",
  onSave,
  checklistsDisabled = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<NoteEditorMode>("visual");
  const [conversionWarning, setConversionWarning] = useState<string | null>(null);

  function switchMode(next: NoteEditorMode) {
    if (next === mode) return;
    if (next === "visual") {
      setConversionWarning(getMarkdownConversionWarning(value));
    } else {
      setConversionWarning(null);
    }
    setMode(next);
  }

  return (
    <div className="space-y-3" data-testid="note-editor">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-1"
          role="group"
          aria-label="Editor mode"
        >
          <Button
            type="button"
            variant={mode === "visual" ? "primary" : "secondary"}
            className="min-h-9 px-3 py-1.5 text-xs"
            aria-pressed={mode === "visual"}
            data-testid="editor-mode-visual"
            onClick={() => switchMode("visual")}
          >
            Visual
          </Button>
          <Button
            type="button"
            variant={mode === "markdown" ? "primary" : "secondary"}
            className="min-h-9 px-3 py-1.5 text-xs font-mono"
            aria-pressed={mode === "markdown"}
            data-testid="editor-mode-markdown"
            onClick={() => switchMode("markdown")}
            title="Markdown expert mode"
          >
            &lt;/&gt;
          </Button>
        </div>
        <span className="text-xs text-[var(--muted)]">
          {mode === "visual" ? "Visual editor" : "Markdown expert mode"}
        </span>
      </div>

      {conversionWarning && mode === "visual" && (
        <Alert variant="warning" role="status" data-testid="editor-conversion-warning">
          {conversionWarning}
        </Alert>
      )}

      {mode === "visual" ? (
        <VisualNoteEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? "Write your note…"}
          maxLength={maxLength}
          id={id === "note-markdown" ? "note-visual-editor" : `${id}-visual`}
          onSave={onSave}
        />
      ) : (
        <MarkdownExpertEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? "Write in Markdown…"}
          maxLength={maxLength}
          id={id}
          onSave={onSave}
          checklistsDisabled={checklistsDisabled}
        />
      )}
    </div>
  );
}
