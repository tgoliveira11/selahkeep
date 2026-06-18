"use client";

import { useMemo, useCallback } from "react";
import { renderSanitizedMarkdown } from "@/features/notes/sanitize-markdown";
import { toggleChecklistAtIndex } from "@/lib/notes/markdown-checklist";
import { highlightSearchTermsInHtml } from "@/components/notes/search-highlight";

interface MarkdownPreviewProps {
  markdown: string;
  emptyMessage?: string;
  className?: string;
  /** When set, checklist items are interactive and update markdown source via this callback. */
  onMarkdownChange?: (markdown: string) => void;
  /** Disables checklist toggles while a save is in progress. */
  checklistsDisabled?: boolean;
  /** Client-side search highlight query — never persisted. */
  searchQuery?: string;
}

/**
 * Client-side sanitized Markdown preview. Source remains encrypted on save;
 * only decrypted note body is passed here after vault unlock.
 */
export function MarkdownPreview({
  markdown,
  emptyMessage = "Nothing to preview yet.",
  className = "",
  onMarkdownChange,
  checklistsDisabled = false,
  searchQuery = "",
}: MarkdownPreviewProps) {
  const trimmed = markdown.trim();
  const interactive = Boolean(onMarkdownChange);
  const html = useMemo(() => {
    if (!trimmed) return "";
    const rendered = renderSanitizedMarkdown(trimmed, { interactiveChecklists: interactive });
    return searchQuery.trim()
      ? highlightSearchTermsInHtml(rendered, searchQuery)
      : rendered;
  }, [trimmed, interactive, searchQuery]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onMarkdownChange || checklistsDisabled) return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "checkbox") return;

      event.preventDefault();
      const rawIndex = target.getAttribute("data-checklist-index");
      if (rawIndex === null) return;

      const itemIndex = Number.parseInt(rawIndex, 10);
      if (Number.isNaN(itemIndex)) return;

      onMarkdownChange(toggleChecklistAtIndex(markdown, itemIndex));
    },
    [checklistsDisabled, markdown, onMarkdownChange]
  );

  return (
    <div
      className={`prose-note ${className}`.trim()}
      data-testid="markdown-preview"
      onClick={interactive ? handleClick : undefined}
      dangerouslySetInnerHTML={{
        __html:
          html ||
          `<p class="text-[var(--muted)]">${emptyMessage}</p>`,
      }}
    />
  );
}
