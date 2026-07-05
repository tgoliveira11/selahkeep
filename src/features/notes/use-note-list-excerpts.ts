"use client";

import { useEffect, useState } from "react";
import { useOnVaultLocked } from "@tgoliveira/vault-core/react";
import { notesApi } from "@/lib/api-client/notes";
import { decryptNote } from "@/lib/crypto-client/notes";
import { getCachedNoteBody, setCachedNoteBody } from "@/features/notes/eager-decrypt-notes";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import { buildNotePreview, extractNoteExcerpt } from "@/lib/notes/note-excerpt";
import type { VaultIndexPlaintext } from "@/lib/crypto-client/vault-index-types";

/**
 * Decrypt note bodies in memory for list excerpts after vault unlock.
 * Cleared when vault locks; never sent to server. Returns both the inline
 * two-line `excerpts` and richer `previews` (markdown kept) for hover popovers.
 */
export function useNoteListExcerpts(
  index: VaultIndexPlaintext | null,
  vaultUnlocked: boolean,
  enabled: boolean
): { excerpts: Map<string, string>; previews: Map<string, string>; loading: boolean } {
  const [excerpts, setExcerpts] = useState<Map<string, string>>(new Map());
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const entryKey = index?.entries.map((entry) => entry.id).join(",") ?? "";

  useEffect(() => {
    if (!enabled || !vaultUnlocked || !index) {
      setExcerpts(new Map());
      setPreviews(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    const vaultKey = getSessionVaultKey();
    if (!vaultKey) {
      setExcerpts(new Map());
      return;
    }
    const sessionKey = vaultKey;
    const activeIndex = index;

    async function load() {
      setLoading(true);
      const next = new Map<string, string>();
      const nextPreviews = new Map<string, string>();
      try {
        const activeEntries = activeIndex.entries.filter((entry) => !entry.trashed);
        await Promise.all(
          activeEntries.slice(0, 50).map(async (entry) => {
            let body = getCachedNoteBody(entry.id);
            if (body === undefined) {
              const note = await notesApi.get(entry.id);
              const decrypted = await decryptNote(
                note.encryptedMetadata,
                note.encryptedBody,
                note.encryptedWrappedNoteKey,
                sessionKey
              );
              body = decrypted.body;
              setCachedNoteBody(entry.id, body);
            }
            const excerpt = extractNoteExcerpt(body);
            if (excerpt) next.set(entry.id, excerpt);
            const preview = buildNotePreview(body);
            if (preview) nextPreviews.set(entry.id, preview);
          })
        );
        if (!cancelled) {
          setExcerpts(next);
          setPreviews(nextPreviews);
        }
      } catch {
        if (!cancelled) {
          setExcerpts(new Map());
          setPreviews(new Map());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, vaultUnlocked, entryKey, index]);

  useOnVaultLocked(() => {
    setExcerpts(new Map());
    setPreviews(new Map());
    setLoading(false);
  });

  return { excerpts, previews, loading };
}
