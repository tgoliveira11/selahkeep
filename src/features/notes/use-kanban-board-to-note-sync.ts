"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notesApi } from "@/lib/api-client/notes";
import { decryptNote, type NoteMetadataPlaintext } from "@/lib/crypto-client/notes";
import { syncNoteAndBoardFromBoardChange } from "@/lib/notes/kanban-sync";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

const BOARD_TO_NOTE_DEBOUNCE_MS = 800;

export interface UseKanbanBoardToNoteSyncOptions {
  board: KanbanBoardPlaintext | null;
  enabled: boolean;
  saveBoard: (
    board: KanbanBoardPlaintext,
    wrappedKey?: EncryptedPayload | null,
    options?: { appendVersion?: boolean }
  ) => Promise<KanbanBoardPlaintext>;
  updateNote: (
    noteId: string,
    metadata: NoteMetadataPlaintext,
    body: string,
    wrappedKey: EncryptedPayload
  ) => Promise<unknown>;
  encryptedWrappedKey: EncryptedPayload | null;
}

function boardFingerprint(board: KanbanBoardPlaintext): string {
  return JSON.stringify({
    updatedAt: board.updatedAt,
    cards: board.cards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      columnId: card.columnId,
      order: card.order,
      dueDate: card.dueDate,
      priority: card.priority,
      source: card.source,
      statusHistory: card.statusHistory,
    })),
  });
}

/** Loads note plaintext for a note-bound board and syncs board edits back to the note. */
export function useKanbanBoardToNoteSync({
  board,
  enabled,
  saveBoard,
  updateNote,
  encryptedWrappedKey,
}: UseKanbanBoardToNoteSyncOptions) {
  const [noteBody, setNoteBody] = useState("");
  const [noteMetadata, setNoteMetadata] = useState<NoteMetadataPlaintext | null>(null);
  const [wrappedKey, setWrappedKey] = useState<EncryptedPayload | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedBoardRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !board || board.scope !== "note" || !board.noteId) {
      setNoteBody("");
      setNoteMetadata(null);
      setWrappedKey(null);
      return;
    }

    let cancelled = false;
    setNoteLoading(true);

    void (async () => {
      try {
        const row = await notesApi.get(board.noteId!);
        const decrypted = await decryptNote(
          row.encryptedMetadata,
          row.encryptedBody,
          row.encryptedWrappedNoteKey
        );
        if (!cancelled) {
          setNoteBody(decrypted.body);
          setNoteMetadata(decrypted.metadata);
          setWrappedKey(row.encryptedWrappedNoteKey);
          lastSyncedBoardRef.current = null;
        }
      } catch {
        if (!cancelled) {
          setNoteBody("");
          setNoteMetadata(null);
          setWrappedKey(null);
        }
      } finally {
        if (!cancelled) setNoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [board?.boardId, board?.noteId, board?.scope, enabled]);

  const fingerprint = board ? boardFingerprint(board) : null;

  const runSync = useCallback(async () => {
    if (
      !enabled ||
      syncingRef.current ||
      !board ||
      board.scope !== "note" ||
      !board.noteId ||
      !noteMetadata ||
      !wrappedKey ||
      noteLoading
    ) {
      return;
    }
    if (lastSyncedBoardRef.current === fingerprint) return;

    const result = syncNoteAndBoardFromBoardChange(board, noteBody);
    if (!result.changed) {
      lastSyncedBoardRef.current = fingerprint;
      return;
    }

    syncingRef.current = true;
    try {
      lastSyncedBoardRef.current = fingerprint;
      setNoteBody(result.body);
      await updateNote(board.noteId, noteMetadata, result.body, wrappedKey);
      await saveBoard(result.board, encryptedWrappedKey, { appendVersion: true });
    } finally {
      syncingRef.current = false;
    }
  }, [
    board,
    fingerprint,
    enabled,
    encryptedWrappedKey,
    noteBody,
    noteLoading,
    noteMetadata,
    saveBoard,
    updateNote,
    wrappedKey,
  ]);

  useEffect(() => {
    if (!enabled || !board || board.scope !== "note" || noteLoading || !noteMetadata) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSync();
    }, BOARD_TO_NOTE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fingerprint, enabled, board, noteLoading, noteMetadata, runSync]);

  return { noteBody, noteLoading, runSync };
}
