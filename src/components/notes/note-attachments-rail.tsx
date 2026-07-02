"use client";

import { useCallback } from "react";
import { Alert } from "@/components/ui/alert";
import { AttachmentPreviewPopover } from "@/components/notes/attachment-preview-popover";
import {
  NoteDetailRailBadge,
  NoteDetailRailCard,
  NoteDetailRailRow,
} from "@/components/notes/note-detail-rail";
import { useNoteAttachments, type AttachmentListItem } from "@/features/notes/use-note-attachments";
import { canPreviewAttachment } from "@/lib/notes/attachment-preview";
import { getFileExtension } from "@/lib/notes/attachment-file-types";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { DecryptedAttachment } from "@/lib/crypto-client/note-attachments";

interface NoteAttachmentsRailProps {
  noteId: string;
  userId: string;
  wrappedKey: EncryptedPayload;
  enabled: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IconAttachment() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function fileBadgeLabel(filename: string, mimeType: string): string {
  const ext = getFileExtension(filename);
  if (ext) return ext.slice(0, 3).toUpperCase();
  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType === "application/pdf") return "PDF";
  return "FILE";
}

function AttachmentRailItem({
  item,
  onDownload,
  getDecryptedAttachment,
}: {
  item: AttachmentListItem;
  onDownload: () => void;
  getDecryptedAttachment: (attachmentId: string) => Promise<DecryptedAttachment>;
}) {
  const previewable = canPreviewAttachment(item.metadata.mimeType, item.metadata.filename);
  const loadDecrypted = useCallback(
    () => getDecryptedAttachment(item.id),
    [getDecryptedAttachment, item.id]
  );

  const row = (
    <NoteDetailRailRow
      testId="note-attachment-rail-item"
      badge={
        <NoteDetailRailBadge>
          {fileBadgeLabel(item.metadata.filename, item.metadata.mimeType)}
        </NoteDetailRailBadge>
      }
      action={
        <button
          type="button"
          onClick={onDownload}
          className="text-[12px] font-semibold text-[var(--primary)] hover:underline"
          data-testid="note-attachment-rail-download"
        >
          Download
        </button>
      }
    >
      <p
        className="truncate text-[13px] font-semibold leading-snug text-[var(--foreground)]"
        title={item.metadata.filename}
      >
        {item.metadata.filename}
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{formatFileSize(item.metadata.sizeBytes)}</p>
    </NoteDetailRailRow>
  );

  if (!previewable) return row;

  return (
    <AttachmentPreviewPopover metadata={item.metadata} loadDecrypted={loadDecrypted}>
      {row}
    </AttachmentPreviewPopover>
  );
}

/** Encrypted attachments card for the note detail right rail. */
export function NoteAttachmentsRail({
  noteId,
  userId,
  wrappedKey,
  enabled,
}: NoteAttachmentsRailProps) {
  const { items, loading, error, downloadAttachment, getDecryptedAttachment } = useNoteAttachments({
    owner: { kind: "note", id: noteId },
    userId,
    wrappedKey,
    enabled,
  });

  if (!enabled) return null;

  return (
    <NoteDetailRailCard
      testId="note-attachments-rail"
      title="Attachments"
      icon={<IconAttachment />}
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

      {!loading && !error && items.length === 0 && (
        <p className="text-[13px] text-[var(--muted)]" data-testid="note-attachments-rail-empty">
          No attachments
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="note-detail-rail-list" role="list" data-testid="note-attachments-rail-list">
          {items.map((item) => (
            <AttachmentRailItem
              key={item.id}
              item={item}
              onDownload={() => void downloadAttachment(item.id)}
              getDecryptedAttachment={getDecryptedAttachment}
            />
          ))}
        </div>
      )}
    </NoteDetailRailCard>
  );
}
