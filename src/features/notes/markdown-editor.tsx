"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Alert } from "@/components/ui/alert";
import { EditorStatusBar, type EditorStatus } from "@/components/notes/editor-status-bar";
import { EditorToolbar } from "@/components/notes/editor-toolbar";
import { MarkdownExpertEditor } from "@/features/notes/markdown-expert-editor";
import { VisualNoteEditor } from "@/features/notes/visual-note-editor";
import {
  applyMarkdownWrap,
  type WrapAction,
} from "@/lib/notes/markdown-actions";
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
  status?: EditorStatus;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  maxLength = 50_000,
  id = "note-markdown",
  onSave,
  checklistsDisabled = false,
  status = "idle",
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<NoteEditorMode>("visual");
  const [conversionWarning, setConversionWarning] = useState<string | null>(null);
  const [visualEditor, setVisualEditor] = useState<Editor | null>(null);

  const applyMarkdownAction = useCallback(
    (action: WrapAction) => {
      const el = document.getElementById(id) as HTMLTextAreaElement | null;
      if (!el) return;

      const { next, cursor } = applyMarkdownWrap(
        value,
        action,
        el.selectionStart,
        el.selectionEnd,
        maxLength
      );
      onChange(next);

      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [id, maxLength, onChange, value]
  );

  function switchMode() {
    const next: NoteEditorMode = mode === "visual" ? "markdown" : "visual";
    if (next === "visual") {
      setConversionWarning(getMarkdownConversionWarning(value));
    } else {
      setConversionWarning(null);
    }
    setMode(next);
  }

  return (
    <div className="note-editor" data-testid="note-editor">
      <div className="note-editor-card">
        <EditorToolbar
          mode={mode}
          editor={mode === "visual" ? visualEditor : null}
          onMarkdownAction={mode === "markdown" ? applyMarkdownAction : undefined}
          onModeToggle={switchMode}
        />

        {conversionWarning && mode === "visual" && (
          <Alert
            variant="warning"
            role="status"
            className="note-editor-card__warning"
            data-testid="editor-conversion-warning"
          >
            {conversionWarning}
          </Alert>
        )}

        <div className="note-editor-card__body">
          {mode === "visual" ? (
            <VisualNoteEditor
              value={value}
              onChange={onChange}
              placeholder={placeholder ?? "Write what you want to remember…"}
              maxLength={maxLength}
              id={id === "note-markdown" ? "note-visual-editor" : `${id}-visual`}
              onSave={onSave}
              onEditorReady={setVisualEditor}
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

        <EditorStatusBar status={status} mode={mode} />
      </div>
    </div>
  );
}
