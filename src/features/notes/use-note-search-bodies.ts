"use client";

import { useEffect, useState } from "react";
import { notesApi } from "@/lib/api-client/notes";
import { decryptNote } from "@/lib/crypto-client/notes";
import {
  getCachedNoteBody,
  setCachedNoteBody,
} from "@/features/notes/eager-decrypt-notes";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import type { VaultIndexPlaintext } from "@/lib/crypto-client/vault-index-types";
import { parseSearchTerms } from "@/lib/notes/search-normalize";

/**
 * Load decrypted note bodies in memory for full-text search after vault unlock.
 * Bodies are never sent to the server and are cleared when the vault locks.
 */
export function useNoteSearchBodies(
  index: VaultIndexPlaintext | null,
  searchQuery: string,
  vaultUnlocked: boolean
): { bodies: Map<string, string> | undefined; loading: boolean } {
  const [bodies, setBodies] = useState<Map<string, string> | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const terms = parseSearchTerms(searchQuery);
  const needsBodies = vaultUnlocked && Boolean(index) && terms.length > 0;

  const entryKey = index?.entries.map((entry) => entry.id).join(",") ?? "";

  useEffect(() => {
    if (!needsBodies || !index) {
      setBodies(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const vaultKey = getSessionVaultKey();
    if (!vaultKey) {
      setBodies(undefined);
      return;
    }
    const sessionKey = vaultKey;

    const activeIndex = index;

    async function load() {
      setLoading(true);
      const next = new Map<string, string>();
      try {
        await Promise.all(
          activeIndex.entries.map(async (entry) => {
            const cached = getCachedNoteBody(entry.id);
            if (cached !== undefined) {
              next.set(entry.id, cached);
              return;
            }
            const note = await notesApi.get(entry.id);
            const decrypted = await decryptNote(
              note.encryptedMetadata,
              note.encryptedBody,
              note.encryptedWrappedNoteKey,
              sessionKey
            );
            setCachedNoteBody(entry.id, decrypted.body);
            next.set(entry.id, decrypted.body);
          })
        );
        if (!cancelled) setBodies(next);
      } catch {
        if (!cancelled) setBodies(undefined);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [needsBodies, entryKey, searchQuery, index]);

  useEffect(() => {
    if (!vaultUnlocked) {
      setBodies(undefined);
      setLoading(false);
    }
  }, [vaultUnlocked]);

  return { bodies: needsBodies ? bodies : undefined, loading };
}
