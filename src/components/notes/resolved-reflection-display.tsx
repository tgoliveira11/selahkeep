"use client";

import type { ResolvedReflection } from "@/lib/notes/note-lifecycle";
import { formatNoteListDates } from "@/lib/notes/note-dates";

interface ResolvedReflectionDisplayProps {
  reflection: ResolvedReflection;
}

/** Read-only resolved reflection on note detail. */
export function ResolvedReflectionDisplay({ reflection }: ResolvedReflectionDisplayProps) {
  const fields = [
    { label: "What changed", value: reflection.whatChanged },
    { label: "How it was resolved", value: reflection.howResolved },
    { label: "What to remember", value: reflection.whatToRemember },
  ].filter((field) => field.value?.trim());

  if (fields.length === 0) return null;

  return (
    <section
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-4"
      data-testid="resolved-reflection-display"
      aria-label="Resolved reflection"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
        Resolved reflection
      </h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Resolved {formatNoteListDates(reflection.resolvedAt, reflection.resolvedAt)}
      </p>
      <dl className="mt-3 space-y-3">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-medium text-[var(--muted)]">{field.label}</dt>
            <dd className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
