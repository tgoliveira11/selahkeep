"use client";

import { useMemo } from "react";
import { VaultSensitiveRegion } from "@tgoliveira/vault-core/react";
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
        <span
          className="inline-flex items-center gap-1.5 font-semibold text-[var(--add-fg)]"
          data-testid="diff-added-count"
        >
          <span className="inline-block h-2 w-2 rounded-sm bg-[var(--add-fg)]" aria-hidden />
          {stats.added} added
        </span>
        <span
          className="inline-flex items-center gap-1.5 font-semibold text-[var(--del-fg)]"
          data-testid="diff-removed-count"
        >
          <span className="inline-block h-2 w-2 rounded-sm bg-[var(--del-fg)]" aria-hidden />
          {stats.removed} removed
        </span>
      </div>

      <VaultSensitiveRegion>
        {isUnchanged(lines) ? (
          <p className="text-sm text-[var(--muted)]" data-testid="diff-no-changes">
            No content differences between these versions.
          </p>
        ) : (
          <pre
            className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-0 text-sm leading-relaxed"
            data-testid="diff-body"
          >
            <code className="block">
              {lines.map((line, i) => (
                <span
                  key={i}
                  data-diff-type={line.type}
                  className={
                    line.type === "added"
                      ? "block border-l-[3px] border-[var(--add-fg)] bg-[var(--add-bg)] px-3"
                      : line.type === "removed"
                        ? "block border-l-[3px] border-[var(--del-fg)] bg-[var(--del-bg)] px-3"
                        : "block border-l-[3px] border-transparent px-3"
                  }
                >
                  <span
                    className={
                      line.type === "added"
                        ? "mr-2 inline-block w-4 select-none font-bold text-[var(--add-fg)]"
                        : line.type === "removed"
                          ? "mr-2 inline-block w-4 select-none font-bold text-[var(--del-fg)]"
                          : "mr-2 inline-block w-4 select-none text-[var(--muted)]"
                    }
                  >
                    {SYMBOL[line.type]}
                  </span>
                  {line.value || " "}
                </span>
              ))}
            </code>
          </pre>
        )}
      </VaultSensitiveRegion>
    </div>
  );
}
