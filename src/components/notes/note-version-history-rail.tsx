"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  NoteDetailRailBadge,
  NoteDetailRailCard,
  NoteDetailRailRow,
} from "@/components/notes/note-detail-rail";
import { formatRelativeNoteDateTime } from "@/lib/notes/note-dates";
import {
  useNoteVersions,
  type NoteVersionSummary,
} from "@/features/notes/use-note-versions";
import type { DecryptedNoteVersion } from "@/lib/crypto-client/note-versions";

function IconVersionHistory() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function versionSubtitle(v: NoteVersionSummary): string {
  if (v.versionNumber === 1) return "Created";
  if (v.title) return `“${v.title}”`;
  return "Edited";
}

interface NoteVersionHistoryRailProps {
  noteId: string;
  enabled: boolean;
  onRestore: (content: DecryptedNoteVersion) => Promise<void>;
  onCompare?: () => void;
  restoring?: boolean;
  refreshKey?: number;
  onVersionCount?: (count: number) => void;
}

/** Version list for the note detail right rail (Stillness mockup). */
export function NoteVersionHistoryRail({
  noteId,
  enabled,
  onRestore,
  onCompare,
  restoring = false,
  refreshKey = 0,
  onVersionCount,
}: NoteVersionHistoryRailProps) {
  const { versions, loading, error, reload, loadVersionContent } = useNoteVersions(
    noteId,
    enabled
  );
  const [restoreTarget, setRestoreTarget] = useState<NoteVersionSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) onVersionCount?.(versions.length);
  }, [loading, onVersionCount, versions.length]);

  useEffect(() => {
    if (enabled) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const confirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setActionError(null);
    try {
      const content = await loadVersionContent(restoreTarget);
      await onRestore(content);
      setRestoreTarget(null);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to restore version");
    }
  }, [loadVersionContent, onRestore, reload, restoreTarget]);

  if (!enabled) return null;

  const latestVersionNumber = versions[0]?.versionNumber ?? null;

  return (
    <>
      <NoteDetailRailCard
        testId="note-version-history-rail"
        title="Version history"
        icon={<IconVersionHistory />}
        headerAction={
          versions.length > 0 && onCompare ? (
            <button
              type="button"
              onClick={onCompare}
              className="text-[12px] font-semibold text-[var(--primary)] hover:underline"
              data-testid="note-version-rail-compare"
            >
              Compare
            </button>
          ) : null
        }
      >
        {loading && (
          <p className="text-sm text-[var(--muted)]" role="status">
            Loading…
          </p>
        )}
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        {!loading && !error && versions.length === 0 && (
          <p className="text-[13px] text-[var(--muted)]" data-testid="no-versions">
            No previous versions yet.
          </p>
        )}

        {!loading && versions.length > 0 && (
          <div className="note-detail-rail-list" role="list" data-testid="version-rail-list">
            {versions.map((v) => {
              const isCurrent = v.versionNumber === latestVersionNumber;
              return (
                <NoteDetailRailRow
                  key={v.id}
                  testId={`version-rail-row-${v.versionNumber}`}
                  badge={
                    <NoteDetailRailBadge active={isCurrent}>{v.versionNumber}</NoteDetailRailBadge>
                  }
                  action={
                    isCurrent ? (
                      <span className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                        Current
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={restoring}
                        onClick={() => setRestoreTarget(v)}
                        className="text-[12px] font-semibold text-[var(--primary)] hover:underline disabled:opacity-60"
                        data-testid={`version-rail-restore-${v.versionNumber}`}
                      >
                        Restore
                      </button>
                    )
                  }
                >
                  <p className="text-[13px] font-semibold leading-snug text-[var(--foreground)]">
                    {formatRelativeNoteDateTime(v.createdAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{versionSubtitle(v)}</p>
                </NoteDetailRailRow>
              );
            })}
          </div>
        )}
      </NoteDetailRailCard>

      {actionError && (
        <Alert variant="danger" role="alert" className="mt-2">
          {actionError}
        </Alert>
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
    </>
  );
}
