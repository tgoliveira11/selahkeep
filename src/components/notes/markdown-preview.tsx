"use client";

import { renderSanitizedMarkdown } from "@/features/notes/sanitize-markdown";

interface MarkdownPreviewProps {
  markdown: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Client-side sanitized Markdown preview. Source remains encrypted on save;
 * only decrypted note body is passed here after vault unlock.
 */
export function MarkdownPreview({
  markdown,
  emptyMessage = "Nothing to preview yet.",
  className = "",
}: MarkdownPreviewProps) {
  const trimmed = markdown.trim();
  const html = trimmed ? renderSanitizedMarkdown(trimmed) : "";

  return (
    <div
      className={`prose-note ${className}`.trim()}
      data-testid="markdown-preview"
      dangerouslySetInnerHTML={{
        __html: html || `<p class="text-[var(--muted)]">${emptyMessage}</p>`,
      }}
    />
  );
}
