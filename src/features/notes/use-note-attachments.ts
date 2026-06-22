"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { noteAttachmentsApi } from "@/lib/api-client/note-attachments";
import {
  decryptAttachment,
  encryptAttachment,
  type AttachmentMetadataPlaintext,
  type EncryptedAttachmentPayload,
} from "@/lib/crypto-client/note-attachments";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  getMaxAttachmentSizeBytes,
  getMaxAttachmentsPerNote,
} from "@/lib/config/attachment-policy";
import { attachmentRejectionReason } from "@/lib/notes/attachment-file-types";

export interface AttachmentListItem {
  id: string;
  metadata: AttachmentMetadataPlaintext;
  uploading?: boolean;
  uploadProgress?: number;
  error?: string | null;
}

interface UseNoteAttachmentsOptions {
  noteId: string | null;
  userId: string | null;
  wrappedKey: EncryptedPayload | null;
  enabled: boolean;
  onAttachmentsChange?: () => void;
}

export function useNoteAttachments({
  noteId,
  userId,
  wrappedKey,
  enabled,
  onAttachmentsChange,
}: UseNoteAttachmentsOptions) {
  const [items, setItems] = useState<AttachmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Map<string, File>>(new Map());

  const reload = useCallback(async () => {
    if (!noteId || !enabled || !wrappedKey) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { attachments } = await noteAttachmentsApi.list(noteId);
      const decrypted = await Promise.all(
        attachments.map(async (record) => {
          const payload: EncryptedAttachmentPayload = {
            id: record.id,
            encryptedMetadata: record.encryptedMetadata,
            encryptedBlob: record.encryptedBlob,
            blobEncryptionVersion: record.blobEncryptionVersion as EncryptedAttachmentPayload["blobEncryptionVersion"],
            ciphertextBytes: record.ciphertextBytes,
          };
          const { metadata } = await decryptAttachment(payload, wrappedKey);
          return { id: record.id, metadata };
        })
      );
      setItems(decrypted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attachments");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [noteId, enabled, wrappedKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!noteId || !userId || !wrappedKey) {
        throw new Error("Save the note before adding attachments");
      }

      const rejection = attachmentRejectionReason(file);
      if (rejection) throw new Error(rejection);

      const maxBytes = getMaxAttachmentSizeBytes();
      if (file.size > maxBytes) {
        throw new Error(`File exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit`);
      }

      if (items.length >= getMaxAttachmentsPerNote()) {
        throw new Error("Maximum attachments per note reached");
      }

      const tempId = crypto.randomUUID();
      pendingRef.current.set(tempId, file);
      setItems((current) => [
        ...current,
        {
          id: tempId,
          metadata: { filename: file.name, mimeType: file.type, sizeBytes: file.size },
          uploading: true,
          uploadProgress: 0,
        },
      ]);

      try {
        const encrypted = await encryptAttachment(userId, noteId, tempId, file, wrappedKey);
        setItems((current) =>
          current.map((item) =>
            item.id === tempId ? { ...item, uploadProgress: 80 } : item
          )
        );
        await noteAttachmentsApi.create(noteId, encrypted);
        pendingRef.current.delete(tempId);
        onAttachmentsChange?.();
        await reload();
      } catch (e) {
        pendingRef.current.delete(tempId);
        const message = e instanceof Error ? e.message : "Upload failed";
        setItems((current) => current.filter((item) => item.id !== tempId));
        throw new Error(message);
      }
    },
    [items.length, noteId, onAttachmentsChange, reload, userId, wrappedKey]
  );

  const removeAttachment = useCallback(
    async (attachmentId: string) => {
      if (!noteId) return;
      await noteAttachmentsApi.delete(noteId, attachmentId);
      onAttachmentsChange?.();
      await reload();
    },
    [noteId, onAttachmentsChange, reload]
  );

  const getDecryptedAttachment = useCallback(
    async (attachmentId: string) => {
      if (!noteId || !wrappedKey) {
        throw new Error("Vault must be unlocked to preview attachments");
      }
      const record = await noteAttachmentsApi.get(noteId, attachmentId);
      const payload: EncryptedAttachmentPayload = {
        id: record.id,
        encryptedMetadata: record.encryptedMetadata,
        encryptedBlob: record.encryptedBlob,
        blobEncryptionVersion: record.blobEncryptionVersion as EncryptedAttachmentPayload["blobEncryptionVersion"],
        ciphertextBytes: record.ciphertextBytes,
      };
      return decryptAttachment(payload, wrappedKey);
    },
    [noteId, wrappedKey]
  );

  const downloadAttachment = useCallback(
    async (attachmentId: string) => {
      const { metadata, bytes } = await getDecryptedAttachment(attachmentId);
      const blob = new Blob([new Uint8Array(bytes)], { type: metadata.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = metadata.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [getDecryptedAttachment]
  );

  const getPendingFile = useCallback((attachmentId: string) => {
    return pendingRef.current.get(attachmentId) ?? null;
  }, []);

  return {
    items,
    loading,
    error,
    uploadFile,
    removeAttachment,
    downloadAttachment,
    getDecryptedAttachment,
    getPendingFile,
    reload,
    canUpload: Boolean(noteId && userId && wrappedKey),
  };
}
