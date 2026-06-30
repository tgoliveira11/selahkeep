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

  const boardFingerprint = board
    ? JSON.stringify(
        board.cards.map((card) => ({
          id: card.id,
          title: card.title,
          columnId: card.columnId,
          order: card.order,
          source: card.source,
        }))
      )
    : null;

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
    if (lastSyncedBoardRef.current === boardFingerprint) return;

    const result = syncNoteAndBoardFromBoardChange(board, noteBody);
    if (!result.changed) {
      lastSyncedBoardRef.current = boardFingerprint;
      return;
    }

    syncingRef.current = true;
    try {
      lastSyncedBoardRef.current = boardFingerprint;
      setNoteBody(result.body);
      await updateNote(board.noteId, noteMetadata, result.body, wrappedKey);
      const needsBoardSave = result.board.cards.some((card) => {
        const previous = board.cards.find((item) => item.id === card.id);
        return previous?.source?.key !== card.source?.key;
      });
      if (needsBoardSave) {
        await saveBoard(result.board, encryptedWrappedKey, { appendVersion: false });
      }
    } finally {
      syncingRef.current = false;
    }
  }, [
    board,
    boardFingerprint,
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
  }, [boardFingerprint, enabled, board, noteLoading, noteMetadata, runSync]);

  return { noteBody, noteLoading, runSync };
}
