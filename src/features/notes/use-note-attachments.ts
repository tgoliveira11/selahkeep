"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** Stable identity for note/board wrapped keys — avoids reload loops when callers pass new object refs. */
function wrappedKeyFingerprint(key: EncryptedPayload | null): string | null {
  if (!key) return null;
  return `${key.version}:${key.iv}:${key.ciphertext}`;
}

export function useNoteAttachments({
  owner,
  userId,
  wrappedKey,
  enabled,
  onAttachmentsChange,
  filterIds,
}: UseNoteAttachmentsOptions) {
  // Callers often pass an inline object literal for `owner`, which is a new
  // reference every render — depend on its primitive fields instead so this
  // hook's callbacks/effects don't re-run (and re-fetch) on every render.
  const ownerKind = owner?.kind ?? null;
  const ownerId = owner?.id ?? null;
  const stableOwner = useMemo<AttachmentOwnerRef | null>(
    () => (ownerKind && ownerId ? { kind: ownerKind, id: ownerId } : null),
    [ownerKind, ownerId]
  );
  const wrappedKeyId = wrappedKeyFingerprint(wrappedKey);
  const stableWrappedKey = useMemo(
    () => wrappedKey,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fingerprint is the stable identity
    [wrappedKeyId]
  );

  const [allItems, setAllItems] = useState<AttachmentListItem[]>([]);
  const items = filterIds
    ? allItems.filter((item) => item.uploading || filterIds.includes(item.id))
    : allItems;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Map<string, File>>(new Map());
  const listInFlightRef = useRef<Promise<void> | null>(null);
  const lastFailedLoadRef = useRef<{ key: string; at: number } | null>(null);

  const reload = useCallback(async () => {
    const key = stableWrappedKey;
    if (!stableOwner || !enabled || !key || !wrappedKeyId) {
      setAllItems([]);
      return;
    }

    const loadKey = `${stableOwner.kind}:${stableOwner.id}:${wrappedKeyId}`;
    const recentFailure = lastFailedLoadRef.current;
    if (recentFailure?.key === loadKey && Date.now() - recentFailure.at < 5_000) {
      return;
    }

    if (listInFlightRef.current) {
      return listInFlightRef.current;
    }

    const request = (async () => {
      setLoading(true);
      setError(null);
      try {
        const { attachments } = await noteAttachmentsApi.list(stableOwner);
        const decrypted = await Promise.all(
          attachments.map(async (record) => {
            const payload: EncryptedAttachmentPayload = {
              id: record.id,
              encryptedMetadata: record.encryptedMetadata,
              encryptedBlob: record.encryptedBlob,
              blobEncryptionVersion:
                record.blobEncryptionVersion as EncryptedAttachmentPayload["blobEncryptionVersion"],
              ciphertextBytes: record.ciphertextBytes,
            };
            const { metadata } = await decryptAttachment(payload, key);
            return { id: record.id, metadata };
          })
        );
        lastFailedLoadRef.current = null;
        setAllItems(decrypted);
      } catch (e) {
        lastFailedLoadRef.current = { key: loadKey, at: Date.now() };
        setError(e instanceof Error ? e.message : "Failed to load attachments");
        setAllItems([]);
      } finally {
        setLoading(false);
      }
    })();

    listInFlightRef.current = request;
    try {
      await request;
    } finally {
      if (listInFlightRef.current === request) {
        listInFlightRef.current = null;
      }
    }
  }, [stableOwner, enabled, wrappedKeyId, stableWrappedKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      const key = stableWrappedKey;
      if (!stableOwner || !userId || !key) {
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
        const encrypted = await encryptAttachment(userId, tempId, file, key);
        setAllItems((current) =>
          current.map((item) =>
            item.id === tempId ? { ...item, uploadProgress: 80 } : item
          )
        );
        await noteAttachmentsApi.create(stableOwner, encrypted);
        pendingRef.current.delete(tempId);
        onAttachmentsChange?.();
        lastFailedLoadRef.current = null;
        await reload();
        return tempId;
      } catch (e) {
        pendingRef.current.delete(tempId);
        const message = e instanceof Error ? e.message : "Upload failed";
        setAllItems((current) => current.filter((item) => item.id !== tempId));
        throw new Error(message);
      }
    },
    [allItems.length, stableOwner, onAttachmentsChange, reload, userId, stableWrappedKey]
  );

  const removeAttachment = useCallback(
    async (attachmentId: string) => {
      if (!stableOwner) return;
      await noteAttachmentsApi.delete(stableOwner, attachmentId);
      onAttachmentsChange?.();
      lastFailedLoadRef.current = null;
      await reload();
    },
    [stableOwner, onAttachmentsChange, reload]
  );

  const getDecryptedAttachment = useCallback(
    async (attachmentId: string) => {
      const key = stableWrappedKey;
      if (!stableOwner || !key) {
        throw new Error("Vault must be unlocked to preview attachments");
      }
      const record = await noteAttachmentsApi.get(stableOwner, attachmentId);
      const payload: EncryptedAttachmentPayload = {
        id: record.id,
        encryptedMetadata: record.encryptedMetadata,
        encryptedBlob: record.encryptedBlob,
        blobEncryptionVersion:
          record.blobEncryptionVersion as EncryptedAttachmentPayload["blobEncryptionVersion"],
        ciphertextBytes: record.ciphertextBytes,
      };
      return decryptAttachment(payload, key);
    },
    [stableOwner, stableWrappedKey]
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
    canUpload: Boolean(stableOwner && userId && stableWrappedKey),
  };
}
