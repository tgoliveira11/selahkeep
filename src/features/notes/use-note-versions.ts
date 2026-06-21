"use client";

import { useCallback, useEffect, useState } from "react";
import { noteVersionsApi, type NoteVersionResponse } from "@/lib/api-client/note-versions";
import {
  decryptNoteVersion,
  decryptNoteVersionMetadata,
  type DecryptedNoteVersion,
} from "@/lib/crypto-client/note-versions";

export interface NoteVersionSummary {
  id: string;
  versionNumber: number;
  createdAt: string;
  title: string;
  raw: NoteVersionResponse;
}

/**
 * Loads and decrypts the encrypted version history for a note. Metadata is
 * decrypted up front for the list; full content (body) is decrypted on demand
 * for preview / diff. All decryption is client-side via the active vault key.
 */
export function useNoteVersions(noteId: string | null, enabled: boolean) {
  const [versions, setVersions] = useState<NoteVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!noteId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await noteVersionsApi.list(noteId);
      const summaries = await Promise.all(
        rows.map(async (row) => {
          const metadata = await decryptNoteVersionMetadata(
            row.encryptedMetadata,
            row.encryptedWrappedNoteKey
          );
          return {
            id: row.id,
            versionNumber: row.versionNumber,
            createdAt: row.createdAt,
            title: metadata.title,
            raw: row,
          } satisfies NoteVersionSummary;
        })
      );
      setVersions(summaries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [noteId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setVersions([]);
      return;
    }
    void reload();
  }, [enabled, reload]);

  const loadVersionContent = useCallback(
    async (summary: NoteVersionSummary): Promise<DecryptedNoteVersion> => {
      return decryptNoteVersion(
        summary.raw.encryptedMetadata,
        summary.raw.encryptedBody,
        summary.raw.encryptedWrappedNoteKey
      );
    },
    []
  );

  return { versions, loading, error, reload, loadVersionContent };
}
