"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isNoteResolved } from "@/lib/notes/resolved-labels";
import { formatNoteUpdatedShort } from "@/lib/notes/note-dates";
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { NoteStateIndicators } from "@/components/notes/note-state-indicators";
import { NoteResolvedToggle } from "@/components/notes/note-resolved-toggle";
import { HighlightedText } from "@/components/notes/search-highlight";
import { SearchResultSnippet } from "@/components/notes/search-result-snippet";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { cn } from "@/lib/ui/cn";

interface NoteCardProps {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  answered: boolean;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  trashed?: boolean;
  categoryName?: string | null;
  tagNames?: string[];
  searchQuery?: string;
  bodySnippet?: string | null;
  bodyExcerpt?: string | null;
  bodyPreview?: string | null;
  kanbanTotal?: number;
  kanbanDone?: number;
  locked?: boolean;
  resolving?: boolean;
  onToggleResolved?: () => void;
}

/**
 * Note card — "Stillness" design (docs/DESIGN_SYSTEM.md, hero specs):
 * header row (outlined category pill · Resolved badge · pin/state actions),
 * title, two-line excerpt, footer (tag chips · updated date).
 */
export function NoteCard({
  id,
  title,
  updatedAt,
  answered,
  pinned = false,
  favorite = false,
  archived = false,
  trashed = false,
  categoryName,
  tagNames = [],
  searchQuery = "",
  bodySnippet,
  bodyExcerpt,
  bodyPreview,
  kanbanTotal,
  kanbanDone,
  locked,
  resolving = false,
  onToggleResolved,
}: NoteCardProps) {
  const router = useRouter();
  const resolved = isNoteResolved(answered);
  const q = searchQuery.trim();

  // Hover preview: a small delay before the popover opens avoids flicker while
  // the pointer sweeps across the grid. Showing it only when not searching and
  // not locked keeps it out of the way of the search snippet / locked state.
  const [previewOpen, setPreviewOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only worth a popover when the card isn't already showing the whole note:
  // either the excerpt is char-truncated, or its two-line clamp is hiding text,
  // or there is body content but no inline excerpt at all.
  const excerptRef = useRef<HTMLParagraphElement | null>(null);
  const [excerptClamped, setExcerptClamped] = useState(false);

  useEffect(() => {
    const el = excerptRef.current;
    if (!el) {
      setExcerptClamped(false);
      return;
    }
    const measure = () => setExcerptClamped(el.scrollHeight - el.clientHeight > 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [bodyExcerpt]);

  const excerptTruncated = Boolean(bodyExcerpt?.endsWith("…"));
  const hasHiddenContent = bodyExcerpt
    ? excerptClamped || excerptTruncated
    : Boolean(bodyPreview);
  const canPreview = Boolean(bodyPreview) && !locked && !q && hasHiddenContent;

  function openPreview() {
    if (!canPreview) return;
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setPreviewOpen(true), 2000);
  }

  function closePreview() {
    if (openTimer.current) clearTimeout(openTimer.current);
    setPreviewOpen(false);
  }

  return (
    <div className="relative h-full" onMouseEnter={openPreview} onMouseLeave={closePreview}>
    <div
      className="note-card group flex h-full flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-[15px] transition-shadow hover:shadow-[var(--shadow-md)]"
      data-testid="note-card"
    >
      {/* header row: category · resolved · actions */}
      <div className="mb-2.5 flex items-center gap-2">
        {categoryName && <NoteCategoryLabel name={categoryName} />}
        {resolved && (
          <span
            aria-label="Resolved"
            className="inline-flex items-center gap-1 rounded-md border border-[var(--success-bd)] bg-[var(--success-bg)] px-2 py-[3px] text-[11px] font-semibold text-[var(--success)]"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Resolved
          </span>
        )}
        {/* Clean by default (mockup): a pin glyph for pinned notes; the full
            action cluster reveals on hover/focus, overlaid on the right. */}
        <div className="relative ml-auto flex h-6 shrink-0 items-center justify-end">
          {pinned && !trashed && (
            <span
              className="text-[var(--accent)] transition-opacity group-hover:opacity-0"
              aria-hidden="true"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                <path d="M9 3h6l-1 6 4 3v2h-5v7l-1 0-1 0v-7H5v-2l4-3z" />
              </svg>
            </span>
          )}
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2 bg-[var(--card)] pl-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <NoteStateIndicators
              answered={false}
              pinned={pinned}
              favorite={favorite}
              archived={archived}
              trashed={trashed}
            />
            {onToggleResolved && !trashed && (
              <NoteResolvedToggle
                answered={answered}
                resolving={resolving}
                onToggle={onToggleResolved}
              />
            )}
          </div>
        </div>
      </div>

      <Link
        href={`/notes/${id}`}
        className="flex flex-1 flex-col rounded-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        <p
          className={cn(
            "text-base font-semibold tracking-[-0.01em]",
            locked && "text-[var(--muted)]"
          )}
        >
          {q ? <HighlightedText text={title} query={searchQuery} /> : title}
        </p>

        {q && bodySnippet ? (
          <SearchResultSnippet
            snippet={bodySnippet}
            query={searchQuery}
            className="mt-1.5 line-clamp-2"
          />
        ) : (
          !q &&
          bodyExcerpt &&
          !locked && (
            <p
              ref={excerptRef}
              className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--fg-2)]"
              data-testid="note-card-excerpt"
            >
              {bodyExcerpt}
            </p>
          )
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="flex flex-wrap items-center gap-1.5" data-testid="note-card-metadata">
            {tagNames.map((name) => (
              <NoteTagChip key={name} name={name} />
            ))}
            {typeof kanbanTotal === "number" && kanbanTotal > 0 && (
              <span className="inline-flex rounded-full border border-[var(--border-2)] px-2 py-[3px] text-[11px] font-semibold text-[var(--primary)]">
                Kanban {kanbanDone ?? 0}/{kanbanTotal}
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11.5px] text-[var(--muted)]">
            {formatNoteUpdatedShort(updatedAt)}
          </span>
        </div>
      </Link>
    </div>

      {canPreview && previewOpen && (
        <div
          role="link"
          tabIndex={0}
          aria-label={`Open note: ${title}`}
          data-testid="note-card-preview"
          onClick={() => router.push(`/notes/${id}`)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              router.push(`/notes/${id}`);
            }
          }}
          // Starts at the card's top edge (overlapping it) so the pointer can
          // travel from card into the popover with no gap that would drop hover.
          // Clicking anywhere in it opens the note.
          className="absolute left-0 right-0 top-0 z-30 max-h-80 cursor-pointer overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-md)]"
        >
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Preview
          </p>
          <MarkdownPreview
            markdown={bodyPreview ?? ""}
            className="text-[13px] leading-relaxed text-[var(--fg-2)]"
          />
        </div>
      )}
    </div>
  );
}
