"use client";

import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { Textarea } from "@/components/ui/textarea";
import {
  applyMarkdownWrap,
  resolveMarkdownShortcut,
  shortcutToWrapAction,
} from "@/lib/notes/markdown-actions";

interface MarkdownExpertEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
  onSave?: () => void;
  checklistsDisabled?: boolean;
}

export function MarkdownExpertEditor({
  value,
  onChange,
  placeholder = "Write in Markdown…",
  maxLength = 50_000,
  id = "note-markdown",
  onSave,
  checklistsDisabled = false,
}: MarkdownExpertEditorProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const shortcut = resolveMarkdownShortcut(event.nativeEvent);
    if (!shortcut) return;

    if (shortcut === "save") {
      if (onSave) {
        event.preventDefault();
        onSave();
      }
      return;
    }

    const action = shortcutToWrapAction(shortcut);
    if (action) {
      event.preventDefault();
      const el = event.currentTarget;
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
    }
  }

  return (
    <div className="note-editor-markdown-mode" data-testid="markdown-expert-editor">
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={14}
        className="note-editor-markdown-textarea font-mono text-sm"
        data-testid="markdown-expert-textarea"
        aria-label="Markdown source"
      />

      <details className="note-editor-markdown-preview">
        <summary className="note-editor-markdown-preview__summary">Preview</summary>
        <MarkdownPreview
          markdown={value}
          onMarkdownChange={onChange}
          checklistsDisabled={checklistsDisabled}
          className="note-editor-markdown-preview__content prose-note"
        />
      </details>
    </div>
  );
}
