"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { renderSanitizedMarkdown } from "./sanitize-markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
}

type WrapAction = {
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
};

const WRAP_ACTIONS: WrapAction[] = [
  { label: "Bold", prefix: "**", suffix: "**" },
  { label: "Italic", prefix: "_", suffix: "_" },
  { label: "H1", prefix: "# ", suffix: "", block: true },
  { label: "H2", prefix: "## ", suffix: "", block: true },
  { label: "Quote", prefix: "> ", suffix: "", block: true },
  { label: "List", prefix: "- ", suffix: "", block: true },
  { label: "Link", prefix: "[", suffix: "](https://)" },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write in Markdown…",
  maxLength = 50_000,
  id = "note-markdown",
}: MarkdownEditorProps) {
  function applyWrap(action: WrapAction) {
    const el = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const insertion = action.block && !selected ? action.prefix : `${action.prefix}${selected}${action.suffix}`;
    const next = value.slice(0, start) + insertion + value.slice(end);
    onChange(next.slice(0, maxLength));

    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + insertion.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  const previewHtml = value.trim() ? renderSanitizedMarkdown(value) : "";

  return (
    <div className="space-y-4">
      <div className="markdown-editor-toolbar flex flex-wrap gap-2">
        {WRAP_ACTIONS.map((action) => (
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
      </div>

      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={12}
        className="font-mono text-sm"
      />

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--muted)]">Preview</p>
        <div
          className="prose-note min-h-[8rem] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: previewHtml || "<p class='text-[var(--muted)]'>Nothing to preview yet.</p>" }}
        />
      </div>
    </div>
  );
}
