"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useNoteAttachments, type AttachmentListItem } from "@/features/notes/use-note-attachments";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  getMaxAttachmentSizeMb,
  getMaxAttachmentsPerNote,
} from "@/lib/config/attachment-policy";

interface NoteAttachmentsFieldProps {
  noteId: string | null;
  userId: string | null;
  wrappedKey: EncryptedPayload | null;
  enabled: boolean;
  onAttachmentsChange?: () => void;
  testId?: string;
  readOnly?: boolean;
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
}: {
  item: AttachmentListItem;
  onRemove: () => void;
  onDownload: () => void;
  removing: boolean;
  readOnly?: boolean;
}) {
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2"
      data-testid="note-attachment-item"
    >
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
      <div className="flex shrink-0 gap-2">
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
    </li>
  );
}

export function NoteAttachmentsField({
  noteId,
  userId,
  wrappedKey,
  enabled,
  onAttachmentsChange,
  testId = "note-attachments-field",
  readOnly = false,
}: NoteAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    items,
    loading,
    error,
    uploadFile,
    removeAttachment,
    downloadAttachment,
    canUpload,
  } = useNoteAttachments({
    noteId,
    userId,
    wrappedKey,
    enabled,
    onAttachmentsChange,
  });

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
      for (const file of Array.from(fileList)) {
        try {
          await uploadFile(file);
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
            Save your note first to add encrypted attachments.
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
                onRemove={() => void removeAttachment(item.id)}
                onDownload={() => void downloadAttachment(item.id)}
                removing={false}
                readOnly={readOnly}
              />
            ))}
          </ul>
        )}
      </FormField>
    </div>
  );
}
