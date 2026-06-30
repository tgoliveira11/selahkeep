"use client";

import { useCallback, useEffect, useState } from "react";
import { kanbanApi, type KanbanBoardResponse, type KanbanBoardVersionResponse } from "@/lib/api-client/kanban";
import { vaultApi } from "@/lib/api-client/vault";
import {
  decryptKanbanBoard,
  decryptKanbanVersion,
  encryptKanbanBoard,
  encryptKanbanVersion,
  generateBoardKey,
  wrapBoardKey,
} from "@/lib/crypto-client/kanban";
import {
  createEmptyVaultIndex,
  decryptVaultIndex,
  encryptVaultIndex,
  removeStandaloneKanbanBoardIndexEntry,
  updateVaultIndexEntry,
  upsertStandaloneKanbanBoardIndexEntry,
} from "@/lib/crypto-client/vault-index";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import {
  createKanbanBoardFromNote,
  createStandaloneKanbanBoard,
  mergeKanbanBoardFromNote,
} from "@/lib/notes/kanban-from-note";
import { getKanbanProgress } from "@/lib/notes/kanban-progress";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

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

function indexPatchForBoard(board: KanbanBoardPlaintext) {
  const progress = getKanbanProgress(board);
  return {
    hasKanban: true,
    kanbanTotal: progress.total,
    kanbanDone: progress.done,
    updatedAt: board.updatedAt,
  };
}

async function appendKanbanVersionSnapshot(
  userId: string,
  board: KanbanBoardPlaintext,
  encryptedWrappedKey: EncryptedPayload
): Promise<boolean> {
  try {
    const versionId = crypto.randomUUID();
    const payload = await encryptKanbanVersion(
      userId,
      versionId,
      board,
      encryptedWrappedKey
    );
    await kanbanApi.createVersion(board.boardId, payload);
    return true;
  } catch {
    return false;
  }
}

export interface UseKanbanState {
  board: KanbanBoardPlaintext | null;
  encryptedWrappedKey: EncryptedPayload | null;
  response: KanbanBoardResponse | null;
  standaloneBoards: KanbanBoardPlaintext[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export function useKanban(userId: string | null) {
  const [state, setState] = useState<UseKanbanState>({
    board: null,
    encryptedWrappedKey: null,
    response: null,
    standaloneBoards: [],
    loading: false,
    saving: false,
    error: null,
  });

  useEffect(
    () =>
      subscribeVaultSession(() =>
        setState((current) => ({
          ...current,
          board: null,
          encryptedWrappedKey: null,
          response: null,
          standaloneBoards: [],
          loading: false,
          saving: false,
          error: null,
        }))
      ),
    []
  );

  const hydrateBoard = useCallback(async (row: KanbanBoardResponse) => {
    const board = await decryptKanbanBoard(row.encryptedBoard, row.encryptedWrappedKey);
    setState((current) => ({
      ...current,
      board,
      encryptedWrappedKey: row.encryptedWrappedKey,
      response: row,
    }));
    return board;
  }, []);

  const loadBoard = useCallback(
    async (boardId: string) => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const row = await kanbanApi.get(boardId);
        return await hydrateBoard(row);
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to load board",
        }));
        throw error;
      } finally {
        setState((current) => ({ ...current, loading: false }));
      }
    },
    [hydrateBoard]
  );

  const loadBoardForNote = useCallback(
    async (noteId: string) => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const rows = await kanbanApi.list({ noteId });
        if (rows.length === 0) {
          setState((current) => ({
            ...current,
            board: null,
            encryptedWrappedKey: null,
            response: null,
          }));
          return null;
        }
        return await hydrateBoard(rows[0]);
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to load board",
        }));
        throw error;
      } finally {
        setState((current) => ({ ...current, loading: false }));
      }
    },
    [hydrateBoard]
  );

  const loadStandaloneBoards = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const rows = await kanbanApi.list({ scope: "standalone" });
      const boards = await Promise.all(
        rows.map((row) => decryptKanbanBoard(row.encryptedBoard, row.encryptedWrappedKey))
      );
      setState((current) => ({ ...current, standaloneBoards: boards }));
      return boards;
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Failed to load boards",
      }));
      throw error;
    } finally {
      setState((current) => ({ ...current, loading: false }));
    }
  }, []);

  const saveBoard = useCallback(
    async (
      board: KanbanBoardPlaintext,
      encryptedWrappedKey = state.encryptedWrappedKey,
      options: { appendVersion?: boolean } = {}
    ) => {
      if (!userId) throw new Error("Not authenticated");
      if (!encryptedWrappedKey) throw new Error("Board key is unavailable");
      setState((current) => ({ ...current, saving: true, error: null }));
      try {
        const payload = await encryptKanbanBoard(
          userId,
          board.boardId,
          board,
          encryptedWrappedKey
        );
        const row = await kanbanApi.update(board.boardId, payload);
        if (options.appendVersion) {
          await appendKanbanVersionSnapshot(userId, board, encryptedWrappedKey);
        }
        if (board.scope === "note" && board.noteId) {
          await syncVaultIndex(userId, (index) =>
            updateVaultIndexEntry(index, board.noteId!, indexPatchForBoard(board))
          );
        } else {
          const progress = getKanbanProgress(board);
          await syncVaultIndex(userId, (index) =>
            upsertStandaloneKanbanBoardIndexEntry(index, {
              id: board.boardId,
              title: board.title,
              total: progress.total,
              done: progress.done,
              updatedAt: board.updatedAt,
            })
          );
        }
        setState((current) => ({
          ...current,
          board,
          encryptedWrappedKey,
          response: row,
          standaloneBoards:
            board.scope === "standalone"
              ? [board, ...current.standaloneBoards.filter((item) => item.boardId !== board.boardId)]
              : current.standaloneBoards,
        }));
        return board;
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to save board",
        }));
        throw error;
      } finally {
        setState((current) => ({ ...current, saving: false }));
      }
    },
    [state.encryptedWrappedKey, userId]
  );

  const createNoteBoard = useCallback(
    async (
      noteId: string,
      noteTitle: string,
      body: string,
      encryptedWrappedNoteKey: EncryptedPayload
    ) => {
      if (!userId) throw new Error("Not authenticated");
      setState((current) => ({ ...current, saving: true, error: null }));
      try {
        const board = createKanbanBoardFromNote(noteId, noteTitle, body);
        const payload = await encryptKanbanBoard(
          userId,
          board.boardId,
          board,
          encryptedWrappedNoteKey
        );
        const row = await kanbanApi.create({ ...payload, noteId });
        await appendKanbanVersionSnapshot(userId, board, encryptedWrappedNoteKey);
        await syncVaultIndex(userId, (index) =>
          updateVaultIndexEntry(index, noteId, indexPatchForBoard(board))
        );
        setState((current) => ({
          ...current,
          board,
          encryptedWrappedKey: encryptedWrappedNoteKey,
          response: row,
        }));
        return board;
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to create board",
        }));
        throw error;
      } finally {
        setState((current) => ({ ...current, saving: false }));
      }
    },
    [userId]
  );

  const createStandaloneBoard = useCallback(
    async (title: string) => {
      if (!userId) throw new Error("Not authenticated");
      setState((current) => ({ ...current, saving: true, error: null }));
      try {
        const board = createStandaloneKanbanBoard(title);
        const boardKey = await generateBoardKey();
        const wrappedKey = await wrapBoardKey(userId, board.boardId, boardKey);
        const payload = await encryptKanbanBoard(userId, board.boardId, board, wrappedKey);
        const row = await kanbanApi.create({ ...payload, noteId: null });
        await appendKanbanVersionSnapshot(userId, board, wrappedKey);
        await syncVaultIndex(userId, (index) =>
          upsertStandaloneKanbanBoardIndexEntry(index, {
            id: board.boardId,
            title: board.title,
            total: 0,
            done: 0,
            updatedAt: board.updatedAt,
          })
        );
        setState((current) => ({
          ...current,
          board,
          encryptedWrappedKey: wrappedKey,
          response: row,
          standaloneBoards: [board, ...current.standaloneBoards],
        }));
        return board;
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to create board",
        }));
        throw error;
      } finally {
        setState((current) => ({ ...current, saving: false }));
      }
    },
    [userId]
  );

  const regenerateFromNote = useCallback(
    async (body: string) => {
      if (!state.board) throw new Error("No board loaded");
      const { board, added } = mergeKanbanBoardFromNote(state.board, body);
      await saveBoard(board, state.encryptedWrappedKey, { appendVersion: added > 0 });
      return { board, added };
    },
    [saveBoard, state.board, state.encryptedWrappedKey]
  );

  const deleteBoard = useCallback(
    async (board: KanbanBoardPlaintext) => {
      if (!userId) throw new Error("Not authenticated");
      await kanbanApi.delete(board.boardId);
      if (board.scope === "standalone") {
        await syncVaultIndex(userId, (index) =>
          removeStandaloneKanbanBoardIndexEntry(index, board.boardId)
        );
      }
      setState((current) => ({
        ...current,
        board: current.board?.boardId === board.boardId ? null : current.board,
        standaloneBoards: current.standaloneBoards.filter((item) => item.boardId !== board.boardId),
      }));
    },
    [userId]
  );

  return {
    ...state,
    loadBoard,
    loadBoardForNote,
    loadStandaloneBoards,
    createNoteBoard,
    createStandaloneBoard,
    saveBoard,
    regenerateFromNote,
    deleteBoard,
  };
}

export function useKanbanVersions(boardId: string | null, enabled: boolean) {
  const [versions, setVersions] = useState<KanbanBoardVersionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!boardId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      setVersions(await kanbanApi.listVersions(boardId));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load board history");
    } finally {
      setLoading(false);
    }
  }, [boardId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setVersions([]);
      return;
    }
    void reload();
  }, [enabled, reload]);

  const loadVersionContent = useCallback(
    async (version: KanbanBoardVersionResponse): Promise<KanbanBoardPlaintext> =>
      decryptKanbanVersion(version.encryptedBoard, version.encryptedWrappedKey),
    []
  );

  return { versions, loading, error, reload, loadVersionContent };
}
