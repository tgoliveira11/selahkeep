"use client";

import { useCallback, useEffect, useRef } from "react";
import { syncBoardFromNoteBody } from "@/lib/notes/kanban-sync";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

const NOTE_TO_BOARD_DEBOUNCE_MS = 500;

export interface UseKanbanNoteToBoardSyncOptions {
  body: string;
  board: KanbanBoardPlaintext | null;
  enabled: boolean;
  encryptedWrappedKey: EncryptedPayload | null;
  saveBoard: (
    board: KanbanBoardPlaintext,
    wrappedKey?: EncryptedPayload | null,
    options?: { appendVersion?: boolean }
  ) => Promise<KanbanBoardPlaintext>;
}

/** Debounced note → board sync for the note detail page. */
export function useKanbanNoteToBoardSync({
  body,
  board,
  enabled,
  encryptedWrappedKey,
  saveBoard,
}: UseKanbanNoteToBoardSyncOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedBodyRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const runSync = useCallback(async () => {
    if (
      !enabled ||
      syncingRef.current ||
      !board ||
      board.scope !== "note" ||
      !encryptedWrappedKey
    ) {
      return;
    }
    if (lastSyncedBodyRef.current === body) return;

    const result = syncBoardFromNoteBody(board, body);
    if (!result.changed) {
      lastSyncedBodyRef.current = body;
      return;
    }

    syncingRef.current = true;
    try {
      lastSyncedBodyRef.current = body;
      await saveBoard(result.board, encryptedWrappedKey, {
        appendVersion: result.added > 0 || result.removed > 0,
      });
    } finally {
      syncingRef.current = false;
    }
  }, [body, board, enabled, encryptedWrappedKey, saveBoard]);

  useEffect(() => {
    if (!enabled || !board || board.scope !== "note") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSync();
    }, NOTE_TO_BOARD_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [body, enabled, board, runSync]);

  useEffect(() => {
    if (!board) lastSyncedBodyRef.current = null;
  }, [board]);

  return { runSync };
}
