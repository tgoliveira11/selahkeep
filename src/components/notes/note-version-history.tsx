"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatNoteDateTime } from "@/lib/notes/note-dates";
import {
  useNoteVersions,
  type NoteVersionSummary,
} from "@/features/notes/use-note-versions";
import type { DecryptedNoteVersion } from "@/lib/crypto-client/note-versions";
import { NoteVersionDiff } from "./note-version-diff";

const CURRENT = "current";

interface NoteVersionHistoryProps {
  noteId: string;
  /** Vault unlocked and note decrypted. */
  enabled: boolean;
  currentTitle: string;
  currentBody: string;
  onRestore: (content: DecryptedNoteVersion) => Promise<void>;
  restoring?: boolean;
  /** Bumped by the parent after a save so the list refreshes. */
  refreshKey?: number;
}

/** Browse, compare (GitHub-style), and restore encrypted note versions. */
export function NoteVersionHistory({
  noteId,
  enabled,
  currentTitle,
  currentBody,
  onRestore,
  restoring = false,
  refreshKey = 0,
}: NoteVersionHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const { versions, loading, error, reload, loadVersionContent } = useNoteVersions(
    noteId,
    enabled && expanded
  );
  const bodyCacheRef = useRef<Record<string, string>>({});
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>(CURRENT);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<NoteVersionSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [diffPair, setDiffPair] = useState<{ before: string; after: string } | null>(
    null
  );

  useEffect(() => {
    if (enabled && expanded) {
      bodyCacheRef.current = {};
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Default to comparing the previous version against the current note — the
  // latest stored version equals the current note, so that pair would be empty.
  useEffect(() => {
    if (!selectedA && versions.length > 0) {
      setSelectedA((versions[1] ?? versions[0]).id);
    }
  }, [versions, selectedA]);

  const labelFor = useCallback(
    (key: string): string => {
      if (key === CURRENT) return "Current note";
      const v = versions.find((item) => item.id === key);
      return v ? `Version ${v.versionNumber}` : "—";
    },
    [versions]
  );

  const ensureBody = useCallback(
    async (key: string): Promise<string> => {
      if (key === CURRENT) return currentBody;
      if (key in bodyCacheRef.current) return bodyCacheRef.current[key];
      const summary = versions.find((item) => item.id === key);
      if (!summary) throw new Error("Version not found");
      const content = await loadVersionContent(summary);
      bodyCacheRef.current[key] = content.body;
      return content.body;
    },
    [currentBody, loadVersionContent, versions]
  );

  // Recompute the diff automatically whenever the selection (or data) changes.
  useEffect(() => {
    if (!expanded || !selectedA || versions.length === 0) return;
    let cancelled = false;
    setCompareError(null);
    void (async () => {
      try {
        const [before, after] = await Promise.all([
          ensureBody(selectedA),
          ensureBody(selectedB),
        ]);
        if (!cancelled) setDiffPair({ before, after });
      } catch (e) {
        if (!cancelled) {
          setDiffPair(null);
          setCompareError(e instanceof Error ? e.message : "Failed to compare versions");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, selectedA, selectedB, versions, ensureBody]);

  const confirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setActionError(null);
    try {
      const content = await loadVersionContent(restoreTarget);
      await onRestore(content);
      setRestoreTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to restore version");
    }
  }, [loadVersionContent, onRestore, restoreTarget]);

  const options = useMemo(
    () => [
      ...versions.map((v) => ({
        value: v.id,
        label: `Version ${v.versionNumber} · ${formatNoteDateTime(v.createdAt)}`,
      })),
    ],
    [versions]
  );

  return (
    <section className="mt-6" data-testid="note-version-history">
      <Button
        type="button"
        variant="secondary"
        className="min-h-9"
        data-testid="note-version-history-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Hide version history" : "Version history"}
      </Button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {loading && (
            <p className="text-sm text-[var(--muted)]" role="status">
              Loading version history…
            </p>
          )}
          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}

          {!loading && !error && versions.length === 0 && (
            <p className="text-sm text-[var(--muted)]" data-testid="no-versions">
              No previous versions yet. Each time you save changes, a private
              encrypted snapshot is added here.
            </p>
          )}

          {versions.length > 0 && (
            <>
              <div
                className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3 sm:flex-row sm:items-end"
                data-testid="version-compare-controls"
              >
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-[var(--muted)]">Compare</span>
                  <select
                    className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5"
                    value={selectedA}
                    onChange={(e) => setSelectedA(e.target.value)}
                    data-testid="version-select-a"
                  >
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-[var(--muted)]">With</span>
                  <select
                    className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5"
                    value={selectedB}
                    onChange={(e) => setSelectedB(e.target.value)}
                    data-testid="version-select-b"
                  >
                    <option value={CURRENT}>Current note</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="-mt-2 text-xs text-[var(--muted)]">
                The comparison updates automatically when you change either selection.
              </p>

              {compareError && (
                <Alert variant="danger" role="alert">
                  {compareError}
                </Alert>
              )}

              {diffPair && (
                <NoteVersionDiff
                  before={diffPair.before}
                  after={diffPair.after}
                  beforeLabel={labelFor(selectedA)}
                  afterLabel={labelFor(selectedB)}
                />
              )}

              <ol className="space-y-2" data-testid="version-list">
                {versions.map((v) => {
                  const comparing = v.id === selectedA || v.id === selectedB;
                  const created = v.versionNumber === 1;
                  const subtitle = comparing
                    ? "Comparing"
                    : created
                      ? "Created"
                      : v.title
                        ? `“${v.title}”`
                        : "Edited";
                  return (
                    <li
                      key={v.id}
                      className={
                        comparing
                          ? "flex items-center gap-3 rounded-[10px] border border-[var(--border-2)] bg-[var(--lilac-soft)] px-3.5 py-3"
                          : "flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-3"
                      }
                      data-testid={`version-row-${v.versionNumber}`}
                    >
                      <span
                        className={
                          comparing
                            ? "flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-xs font-bold text-[var(--fg-2)]"
                            : "flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[var(--lilac)] text-xs font-bold text-[var(--primary)]"
                        }
                        aria-hidden="true"
                      >
                        {v.versionNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold text-[var(--foreground)]">
                          Version {v.versionNumber}
                          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                            {formatNoteDateTime(v.createdAt)}
                          </span>
                        </span>
                        <span className="block text-xs text-[var(--muted)]">{subtitle}</span>
                      </span>
                      <button
                        type="button"
                        disabled={restoring}
                        onClick={() => setRestoreTarget(v)}
                        data-testid={`version-restore-${v.versionNumber}`}
                        className="flex-none rounded-[7px] border border-[var(--border-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--primary)] disabled:opacity-60"
                      >
                        Restore
                      </button>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {actionError && (
            <Alert variant="danger" role="alert">
              {actionError}
            </Alert>
          )}
        </div>
      )}

      <ConfirmDialog
        open={restoreTarget !== null}
        title="Restore this version?"
        description="Your note content will be replaced with this version. This is saved as a new version, so nothing in your history is lost."
        confirmLabel="Restore version"
        loading={restoring}
        onConfirm={confirmRestore}
        onCancel={() => setRestoreTarget(null)}
      />
    </section>
  );
}
