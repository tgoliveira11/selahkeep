"use client";

import { formatStorageMb } from "@/features/notes/use-storage-usage";
import type { StorageUsageResponse } from "@/lib/api-client/note-attachments";

interface StorageUsageDisplayProps {
  usage: StorageUsageResponse | null;
  loading?: boolean;
  compact?: boolean;
}

export function StorageUsageDisplay({ usage, loading, compact }: StorageUsageDisplayProps) {
  if (loading && !usage) {
    return (
      <p className="text-sm text-[var(--muted)]" data-testid="storage-usage-loading">
        Calculating encrypted storage…
      </p>
    );
  }

  if (!usage) return null;

  const usedMb = formatStorageMb(usage.totalCiphertextBytes);
  const maxMb = formatStorageMb(usage.maxBytes);
  const notesMb = formatStorageMb(usage.notesCiphertextBytes);
  const attachmentsMb = formatStorageMb(usage.attachmentsCiphertextBytes);

  return (
    <div
      className={compact ? "text-sm text-[var(--muted)]" : "space-y-1"}
      data-testid="storage-usage-display"
      role="status"
    >
      <p className={compact ? undefined : "font-medium text-[var(--foreground)]"}>
        Encrypted storage: {usedMb} of {maxMb}
      </p>
      {!compact && (
        <p className="text-sm text-[var(--muted)]">
          Notes {notesMb} · Attachments {attachmentsMb}
          {usage.partial ? " (partial estimate)" : ""}
        </p>
      )}
      <p className="text-xs text-[var(--muted)]">
        Counts encrypted ciphertext only — not decrypted note size on your device.
      </p>
    </div>
  );
}
