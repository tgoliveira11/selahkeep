"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { noteAttachmentsApi, type AttachmentOwnerRef } from "@/lib/api-client/note-attachments";
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
  owner: AttachmentOwnerRef | null;
  userId: string | null;
  wrappedKey: EncryptedPayload | null;
  enabled: boolean;
  onAttachmentsChange?: () => void;
  /**
   * When the owner holds attachments for more than one thing (e.g. a kanban
   * board's cards), restricts the visible list to these ids. Upload/delete
   * still operate against the shared owner.
   */
  filterIds?: string[] | null;
}

export function useNoteAttachments({
  owner,
  userId,
  wrappedKey,
  enabled,
  onAttachmentsChange,
  filterIds,
}: UseNoteAttachmentsOptions) {
  const [allItems, setAllItems] = useState<AttachmentListItem[]>([]);
  const items = filterIds
    ? allItems.filter((item) => item.uploading || filterIds.includes(item.id))
    : allItems;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Map<string, File>>(new Map());

  const reload = useCallback(async () => {
    if (!owner || !enabled || !wrappedKey) {
      setAllItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { attachments } = await noteAttachmentsApi.list(owner);
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
      setAllItems(decrypted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attachments");
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [owner, enabled, wrappedKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      if (!owner || !userId || !wrappedKey) {
        throw new Error("Save before adding attachments");
      }

      const rejection = attachmentRejectionReason(file);
      if (rejection) throw new Error(rejection);

      const maxBytes = getMaxAttachmentSizeBytes();
      if (file.size > maxBytes) {
        throw new Error(`File exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit`);
      }

      if (allItems.length >= getMaxAttachmentsPerNote()) {
        throw new Error("Maximum attachments reached");
      }

      const tempId = crypto.randomUUID();
      pendingRef.current.set(tempId, file);
      setAllItems((current) => [
        ...current,
        {
          id: tempId,
          metadata: { filename: file.name, mimeType: file.type, sizeBytes: file.size },
          uploading: true,
          uploadProgress: 0,
        },
      ]);

      try {
        const encrypted = await encryptAttachment(userId, tempId, file, wrappedKey);
        setAllItems((current) =>
          current.map((item) =>
            item.id === tempId ? { ...item, uploadProgress: 80 } : item
          )
        );
        await noteAttachmentsApi.create(owner, encrypted);
        pendingRef.current.delete(tempId);
        onAttachmentsChange?.();
        await reload();
        return tempId;
      } catch (e) {
        pendingRef.current.delete(tempId);
        const message = e instanceof Error ? e.message : "Upload failed";
        setAllItems((current) => current.filter((item) => item.id !== tempId));
        throw new Error(message);
      }
    },
    [allItems.length, owner, onAttachmentsChange, reload, userId, wrappedKey]
  );

  const removeAttachment = useCallback(
    async (attachmentId: string) => {
      if (!owner) return;
      await noteAttachmentsApi.delete(owner, attachmentId);
      onAttachmentsChange?.();
      await reload();
    },
    [owner, onAttachmentsChange, reload]
  );

  const getDecryptedAttachment = useCallback(
    async (attachmentId: string) => {
      if (!owner || !wrappedKey) {
        throw new Error("Vault must be unlocked to preview attachments");
      }
      const record = await noteAttachmentsApi.get(owner, attachmentId);
      const payload: EncryptedAttachmentPayload = {
        id: record.id,
        encryptedMetadata: record.encryptedMetadata,
        encryptedBlob: record.encryptedBlob,
        blobEncryptionVersion: record.blobEncryptionVersion as EncryptedAttachmentPayload["blobEncryptionVersion"],
        ciphertextBytes: record.ciphertextBytes,
      };
      return decryptAttachment(payload, wrappedKey);
    },
    [owner, wrappedKey]
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
    canUpload: Boolean(owner && userId && wrappedKey),
  };
}
