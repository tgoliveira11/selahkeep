"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { AttachmentPreview } from "@/components/notes/attachment-preview";
import { useNoteAttachments, type AttachmentListItem } from "@/features/notes/use-note-attachments";
import type { AttachmentOwnerRef } from "@/lib/api-client/note-attachments";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  getMaxAttachmentSizeMb,
  getMaxAttachmentsPerNote,
} from "@/lib/config/attachment-policy";
import { canPreviewAttachment } from "@/lib/notes/attachment-preview";
import type { DecryptedAttachment } from "@/lib/crypto-client/note-attachments";

interface NoteAttachmentsFieldProps {
  owner: AttachmentOwnerRef | null;
  userId: string | null;
  wrappedKey: EncryptedPayload | null;
  enabled: boolean;
  onAttachmentsChange?: () => void;
  testId?: string;
  readOnly?: boolean;
  /** When true (default), previewable attachments show an inline preview on the note detail page. */
  showPreviews?: boolean;
  /** Restricts the visible list to these ids (e.g. one kanban card's attachments within a board). */
  filterIds?: string[] | null;
  /** Fires with the new attachment's id right after a successful upload. */
  onUploaded?: (attachmentId: string) => void;
  /** Fires with the attachment's id right after removal is requested. */
  onRemoved?: (attachmentId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({
  item,
  onRemove,
  onDownload,
  removing,
  readOnly,
  showPreviews,
  getDecryptedAttachment,
  getPendingFile,
}: {
  item: AttachmentListItem;
  onRemove: () => void;
  onDownload: () => void;
  removing: boolean;
  readOnly?: boolean;
  showPreviews: boolean;
  getDecryptedAttachment: (attachmentId: string) => Promise<DecryptedAttachment>;
  getPendingFile: (attachmentId: string) => File | null;
}) {
  const previewable = canPreviewAttachment(item.metadata.mimeType, item.metadata.filename);
  const [previewOpen, setPreviewOpen] = useState(showPreviews && previewable);

  const loadDecrypted = useCallback(
    () => getDecryptedAttachment(item.id),
    [getDecryptedAttachment, item.id]
  );

  return (
    <li
      className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-2"
      data-testid="note-attachment-item"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.metadata.filename}</p>
          <p className="text-xs text-[var(--muted)]">{formatFileSize(item.metadata.sizeBytes)}</p>
          {item.uploading && (
            <p className="text-xs text-[var(--primary)]" role="status">
              Uploading… {item.uploadProgress ? `${item.uploadProgress}%` : ""}
            </p>
          )}
          {item.error && (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {item.error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {previewable && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreviewOpen((open) => !open)}
              data-testid="note-attachment-preview-toggle"
            >
              {previewOpen ? "Hide preview" : "Preview"}
            </Button>
          )}
          {!item.uploading && (
            <>
              <Button type="button" variant="secondary" onClick={onDownload}>
                Download
              </Button>
              {!readOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onRemove}
                  disabled={removing}
                >
                  Remove
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {showPreviews && previewable && (
        <AttachmentPreview
          metadata={item.metadata}
          localFile={item.uploading ? getPendingFile(item.id) : null}
          loadDecrypted={item.uploading ? undefined : loadDecrypted}
          collapsed={!previewOpen}
        />
      )}
    </li>
  );
}

export function NoteAttachmentsField({
  owner,
  userId,
  wrappedKey,
  enabled,
  onAttachmentsChange,
  testId = "note-attachments-field",
  readOnly = false,
  showPreviews = true,
  filterIds,
  onUploaded,
  onRemoved,
}: NoteAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    items,
    loading,
    error,
    uploadFile,
    removeAttachment,
    downloadAttachment,
    getDecryptedAttachment,
    getPendingFile,
    canUpload,
  } = useNoteAttachments({
    owner,
    userId,
    wrappedKey,
    enabled,
    onAttachmentsChange,
    filterIds,
  });

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
      for (const file of Array.from(fileList)) {
        try {
          const attachmentId = await uploadFile(file);
          onUploaded?.(attachmentId);
        } catch {
          // Individual upload errors are surfaced on the next interaction.
        }
      }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div data-testid={testId}>
      <FormField
        id="note-attachments"
        label="Attachments"
        hint={`Up to ${getMaxAttachmentsPerNote()} files, ${getMaxAttachmentSizeMb()} MB each. Encrypted before upload.`}
      >
        {!readOnly && !canUpload && (
          <p className="mb-2 text-sm text-[var(--muted)]">
            Save first to add encrypted attachments.
          </p>
        )}
        {!readOnly && (
          <>
        <input
          ref={inputRef}
          id="note-attachments"
          type="file"
          multiple
          className="sr-only"
          disabled={!canUpload || !enabled}
          onChange={(e) => void handleFilesSelected(e.target.files)}
          data-testid="note-attachments-input"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!canUpload || !enabled}
          onClick={() => inputRef.current?.click()}
          data-testid="note-attachments-upload"
        >
          Upload file
        </Button>
          </>
        )}

        {readOnly && items.length === 0 && !loading && (
          <p className="text-sm text-[var(--muted)]">No attachments</p>
        )}

        {loading && items.length === 0 && (
          <p className="mt-2 text-sm text-[var(--muted)]">Loading attachments…</p>
        )}

        {error && (
          <Alert variant="danger" role="alert" className="mt-2">
            {error}
          </Alert>
        )}

        {items.length > 0 && (
          <ul className="mt-3 space-y-2" data-testid="note-attachments-list">
            {items.map((item) => (
              <AttachmentRow
                key={item.id}
                item={item}
                onRemove={() => {
                  void removeAttachment(item.id);
                  onRemoved?.(item.id);
                }}
                onDownload={() => void downloadAttachment(item.id)}
                removing={false}
                readOnly={readOnly}
                showPreviews={showPreviews}
                getDecryptedAttachment={getDecryptedAttachment}
                getPendingFile={getPendingFile}
              />
            ))}
          </ul>
        )}
      </FormField>
    </div>
  );
}
