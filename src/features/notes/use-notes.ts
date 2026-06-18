"use client";

import { useCallback, useState } from "react";
import { notesApi } from "@/lib/api-client/notes";
import { vaultApi } from "@/lib/api-client/vault";
import {
  decryptNote,
  encryptNote,
  reencryptNoteWithUpdatedMetadata,
  type EncryptNoteInput,
  type NoteMetadataPlaintext,
} from "@/lib/crypto-client/notes";
import {
  addVaultIndexEntry,
  createEmptyVaultIndex,
  decryptVaultIndex,
  encryptVaultIndex,
  removeVaultIndexEntry,
  restoreVaultIndexEntry,
  updateVaultIndexEntry,
} from "@/lib/crypto-client/vault-index";
import { getSessionVaultKey, generateDefaultNoteTitle } from "@/lib/crypto-client/vault";
import {
  duplicateNoteMetadata,
  metadataToIndexEntry,
} from "@/lib/notes/note-metadata";
import { countChecklistItems } from "@/lib/notes/markdown-checklist";

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

async function loadNoteForUpdate(noteId: string) {
  const note = await notesApi.get(noteId);
  const decrypted = await decryptNote(
    note.encryptedMetadata,
    note.encryptedBody,
    note.encryptedWrappedNoteKey
  );
  return { note, decrypted };
}

async function persistMetadataUpdate(
  userId: string,
  noteId: string,
  metadata: NoteMetadataPlaintext,
  body: string,
  wrappedKey: import("@/lib/validation/encrypted-payload").EncryptedPayload
) {
  const updatedMetadata = { ...metadata, updatedAt: new Date().toISOString() };
  const payload = await reencryptNoteWithUpdatedMetadata(
    userId,
    noteId,
    updatedMetadata,
    body,
    wrappedKey
  );
  const note = await notesApi.update(noteId, payload);

  await syncVaultIndex(userId, (index) =>
    updateVaultIndexEntry(
      index,
      noteId,
      metadataToIndexEntry(noteId, updatedMetadata, body)
    )
  );

  return { metadata: updatedMetadata, note };
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
          addVaultIndexEntry(
            index,
            metadataToIndexEntry(noteId, {
              title,
              categoryId: input.categoryId ?? null,
              tagIds: input.tagIds ?? [],
              answered: input.answered ?? false,
              pinned: input.pinned ?? false,
              favorite: input.favorite ?? false,
              archived: input.archived ?? false,
              trashed: input.trashed ?? false,
              trashedAt: input.trashedAt ?? null,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
            }, input.body)
          )
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
        const result = await persistMetadataUpdate(userId, noteId, metadata, body, existingWrappedKey);
        return result.note;
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

  const moveNoteToTrash = useCallback(
    async (noteId: string) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const { decrypted, note } = await loadNoteForUpdate(noteId);
        const now = new Date().toISOString();
        const updatedMetadata: NoteMetadataPlaintext = {
          ...decrypted.metadata,
          trashed: true,
          trashedAt: now,
          pinned: false,
          updatedAt: now,
        };
        const result = await persistMetadataUpdate(
          userId,
          noteId,
          updatedMetadata,
          decrypted.body,
          note.encryptedWrappedNoteKey
        );
        return result.metadata;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to move note to trash";
        setError(message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [userId]
  );

  const restoreNoteFromTrash = useCallback(
    async (noteId: string) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const { decrypted, note } = await loadNoteForUpdate(noteId);
        const updatedMetadata: NoteMetadataPlaintext = {
          ...decrypted.metadata,
          trashed: false,
          trashedAt: null,
        };
        const result = await persistMetadataUpdate(
          userId,
          noteId,
          updatedMetadata,
          decrypted.body,
          note.encryptedWrappedNoteKey
        );
        await syncVaultIndex(userId, (index) => restoreVaultIndexEntry(index, noteId));
        return result.metadata;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to restore note";
        setError(message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [userId]
  );

  const permanentlyDeleteNote = useCallback(
    async (noteId: string) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        await notesApi.delete(noteId);
        await syncVaultIndex(userId, (index) => removeVaultIndexEntry(index, noteId));
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

  /** @deprecated Use moveNoteToTrash */
  const deleteNote = moveNoteToTrash;

  const toggleNoteResolved = useCallback(
    async (noteId: string, answered: boolean) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const { decrypted, note } = await loadNoteForUpdate(noteId);
        const updatedMetadata = {
          ...decrypted.metadata,
          answered,
        };
        const result = await persistMetadataUpdate(
          userId,
          noteId,
          updatedMetadata,
          decrypted.body,
          note.encryptedWrappedNoteKey
        );
        return result.metadata;
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

  const toggleNotePinned = useCallback(
    async (noteId: string, pinned: boolean) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const { decrypted, note } = await loadNoteForUpdate(noteId);
        const updatedMetadata = { ...decrypted.metadata, pinned };
        const result = await persistMetadataUpdate(
          userId,
          noteId,
          updatedMetadata,
          decrypted.body,
          note.encryptedWrappedNoteKey
        );
        return result.metadata;
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

  const toggleNoteFavorite = useCallback(
    async (noteId: string, favorite: boolean) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const { decrypted, note } = await loadNoteForUpdate(noteId);
        const updatedMetadata = { ...decrypted.metadata, favorite };
        const result = await persistMetadataUpdate(
          userId,
          noteId,
          updatedMetadata,
          decrypted.body,
          note.encryptedWrappedNoteKey
        );
        return result.metadata;
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

  const toggleNoteArchived = useCallback(
    async (noteId: string, archived: boolean) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const { decrypted, note } = await loadNoteForUpdate(noteId);
        const updatedMetadata = {
          ...decrypted.metadata,
          archived,
          pinned: archived ? false : decrypted.metadata.pinned,
        };
        const result = await persistMetadataUpdate(
          userId,
          noteId,
          updatedMetadata,
          decrypted.body,
          note.encryptedWrappedNoteKey
        );
        return result.metadata;
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

  const duplicateNote = useCallback(
    async (noteId: string) => {
      if (!userId) throw new Error("Not authenticated");
      setBusy(true);
      setError(null);
      try {
        const { decrypted } = await loadNoteForUpdate(noteId);
        const newNoteId = crypto.randomUUID();
        const now = new Date().toISOString();
        const metadata = duplicateNoteMetadata(decrypted.metadata, decrypted.body, now, now);
        const payload = await encryptNote(userId, newNoteId, {
          title: metadata.title,
          body: decrypted.body,
          categoryId: metadata.categoryId,
          tagIds: metadata.tagIds,
          answered: metadata.answered,
          pinned: metadata.pinned,
          favorite: metadata.favorite,
          archived: metadata.archived,
          trashed: metadata.trashed,
          trashedAt: metadata.trashedAt,
          createdAt: metadata.createdAt,
          updatedAt: metadata.updatedAt,
        });
        const note = await notesApi.create({ id: newNoteId, ...payload });

        await syncVaultIndex(userId, (index) =>
          addVaultIndexEntry(
            index,
            metadataToIndexEntry(newNoteId, metadata, decrypted.body)
          )
        );

        return { noteId: newNoteId, note };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to duplicate note";
        setError(message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [userId]
  );

  return {
    createNote,
    updateNote,
    deleteNote,
    moveNoteToTrash,
    restoreNoteFromTrash,
    permanentlyDeleteNote,
    toggleNoteResolved,
    toggleNotePinned,
    toggleNoteFavorite,
    toggleNoteArchived,
    duplicateNote,
    busy,
    error,
  };
}
