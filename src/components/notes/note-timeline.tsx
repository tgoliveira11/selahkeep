"use client";

import { useState } from "react";
import type { NoteMetadataPlaintext } from "@/lib/crypto-client/notes";
import { buildNoteTimeline } from "@/lib/notes/note-lifecycle";
import { formatNoteListDates } from "@/lib/notes/note-dates";
import { Button } from "@/components/ui/button";

interface NoteTimelineProps {
  metadata: NoteMetadataPlaintext;
}

/** Progressive disclosure timeline — reverse-chronological (newest first). */
export function NoteTimeline({ metadata }: NoteTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const items = buildNoteTimeline(metadata);

  if (items.length === 0) return null;

  return (
    <section className="mt-6" data-testid="note-timeline">
      <Button
        type="button"
        variant="secondary"
        className="min-h-9"
        data-testid="note-timeline-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide timeline" : "Show timeline"}
      </Button>

      {expanded && (
        <ol className="mt-3 space-y-2 border-l-2 border-[var(--border)] pl-4" data-testid="note-timeline-list">
          {items.map((item) => (
            <li key={item.id} className="text-sm" data-testid={`timeline-event-${item.type}`}>
              <span className="font-medium">{item.label}</span>
              <span className="ml-2 text-xs text-[var(--muted)]">
                {formatNoteListDates(item.occurredAt, item.occurredAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
