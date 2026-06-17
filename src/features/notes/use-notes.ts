"use client";

import { useCallback, useState } from "react";
import { notesApi } from "@/lib/api-client/notes";
import { vaultApi } from "@/lib/api-client/vault";
import {
  encryptNote,
  reencryptNoteWithUpdatedMetadata,
  type EncryptNoteInput,
  type NoteMetadataPlaintext,
} from "@/lib/crypto-client/notes";
import {
  addVaultIndexEntry,
  archiveVaultIndexEntry,
  createEmptyVaultIndex,
  decryptVaultIndex,
  encryptVaultIndex,
  updateVaultIndexEntry,
  type VaultIndexEntry,
} from "@/lib/crypto-client/vault-index";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import { generateDefaultNoteTitle } from "@/lib/crypto-client/vault";

function metadataToIndexEntry(noteId: string, metadata: NoteMetadataPlaintext): VaultIndexEntry {
  return {
    id: noteId,
    title: metadata.title,
    categoryId: metadata.categoryId,
    tagIds: metadata.tagIds,
    answered: metadata.answered,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    archived: false,
  };
}

async function syncVaultIndex(
  userId: string,
  mutate: (index: ReturnType<typeof createEmptyVaultIndex>) => ReturnType<typeof createEmptyVaultIndex>
) {
  const vaultKey = getSessionVaultKey();
  if (!vaultKey) throw new Error("Vault is locked");

  const { encryptedVaultIndex } = await vaultApi.getIndex();
  const current = encryptedVaultIndex
    ? await decryptVaultIndex(encryptedVaultIndex, vaultKey)
    : createEmptyVaultIndex();

  const next = mutate(current);
  const encrypted = await encryptVaultIndex(next, userId, vaultKey);
  await vaultApi.updateIndex(encrypted);
}

export function useNotes(userId: string | null) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNote = useCallback(
    async (input: Omit<EncryptNoteInput, "title"> & { title?: string }) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const noteId = crypto.randomUUID();
        const title = input.title?.trim() || generateDefaultNoteTitle();
        const payload = await encryptNote(userId, noteId, { ...input, title });
        const note = await notesApi.create({ id: noteId, ...payload });

        await syncVaultIndex(userId, (index) =>
          addVaultIndexEntry(index, metadataToIndexEntry(noteId, {
            title,
            categoryId: input.categoryId ?? null,
            tagIds: input.tagIds ?? [],
            answered: input.answered ?? false,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          }))
        );

        return note;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to create note";
        setError(message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [userId]
  );

  const updateNote = useCallback(
    async (
      noteId: string,
      metadata: NoteMetadataPlaintext,
      body: string,
      existingWrappedKey: import("@/lib/validation/encrypted-payload").EncryptedPayload
    ) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const updatedMetadata = { ...metadata, updatedAt: new Date().toISOString() };
        const payload = await reencryptNoteWithUpdatedMetadata(
          userId,
          noteId,
          updatedMetadata,
          body,
          existingWrappedKey
        );
        const note = await notesApi.update(noteId, payload);

        await syncVaultIndex(userId, (index) =>
          updateVaultIndexEntry(index, noteId, metadataToIndexEntry(noteId, updatedMetadata))
        );

        return note;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update note";
        setError(message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [userId]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        await notesApi.delete(noteId);
        await syncVaultIndex(userId, (index) => archiveVaultIndexEntry(index, noteId));
        return { success: true as const };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to delete note";
        setError(message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [userId]
  );

  return { createNote, updateNote, deleteNote, busy, error };
}
