"use client";

import { useMemo } from "react";
import { diffLines, diffStats, isUnchanged } from "@/lib/notes/text-diff";

interface NoteVersionDiffProps {
  /** Older text (left side / "before"). */
  before: string;
  /** Newer text (right side / "after"). */
  after: string;
  beforeLabel: string;
  afterLabel: string;
}

const SYMBOL: Record<string, string> = {
  added: "+",
  removed: "-",
  unchanged: " ",
};

/** GitHub-style unified line diff of two decrypted note bodies (client-only). */
export function NoteVersionDiff({
  before,
  after,
  beforeLabel,
  afterLabel,
}: NoteVersionDiffProps) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const stats = useMemo(() => diffStats(lines), [lines]);

  return (
    <div className="note-version-diff" data-testid="note-version-diff">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span>
          Comparing <span className="font-medium">{beforeLabel}</span> →{" "}
          <span className="font-medium">{afterLabel}</span>
        </span>
        <span className="text-[var(--success,#15803d)]" data-testid="diff-added-count">
          +{stats.added}
        </span>
        <span className="text-[var(--danger)]" data-testid="diff-removed-count">
          −{stats.removed}
        </span>
      </div>

      {isUnchanged(lines) ? (
        <p className="text-sm text-[var(--muted)]" data-testid="diff-no-changes">
          No content differences between these versions.
        </p>
      ) : (
        <pre
          className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface,#fff)] p-0 text-sm leading-relaxed"
          data-testid="diff-body"
        >
          <code className="block">
            {lines.map((line, i) => (
              <span
                key={i}
                data-diff-type={line.type}
                className={
                  line.type === "added"
                    ? "block bg-[rgba(34,197,94,0.12)] px-3"
                    : line.type === "removed"
                      ? "block bg-[rgba(239,68,68,0.12)] px-3"
                      : "block px-3"
                }
              >
                <span className="mr-2 inline-block w-4 select-none text-[var(--muted)]">
                  {SYMBOL[line.type]}
                </span>
                {line.value || " "}
              </span>
            ))}
          </code>
        </pre>
      )}
    </div>
  );
}
