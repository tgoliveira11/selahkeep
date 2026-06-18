"use client";

import { useCallback } from "react";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  applyMarkdownWrap,
  MARKDOWN_WRAP_ACTIONS,
  resolveMarkdownShortcut,
  shortcutToWrapAction,
  type WrapAction,
} from "@/lib/notes/markdown-actions";

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
  placeholder = "Write in Markdown…",
  maxLength = 50_000,
  id = "note-markdown",
  onSave,
  checklistsDisabled = false,
}: MarkdownEditorProps) {
  const applyWrap = useCallback(
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
      applyWrap(action);
    }
  }

  return (
    <div className="space-y-4">
      <div className="markdown-editor-toolbar flex flex-wrap items-center gap-2">
        {MARKDOWN_WRAP_ACTIONS.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={() => applyWrap(action)}
          >
            {action.label}
          </Button>
        ))}
        <span className="ml-auto hidden text-xs text-[var(--muted)] sm:inline">
          ⌘/Ctrl+S save · B bold · I italic · ⇧8 list · ⇧C checklist
        </span>
      </div>

      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={12}
        className="font-mono text-sm"
      />

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--muted)]">Preview</p>
        <MarkdownPreview
          markdown={value}
          onMarkdownChange={onChange}
          checklistsDisabled={checklistsDisabled}
          className="min-h-[8rem] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm leading-relaxed"
        />
      </div>
    </div>
  );
}
