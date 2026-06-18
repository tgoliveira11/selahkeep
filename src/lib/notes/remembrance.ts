import type { VaultIndexNoteEntry } from "@/lib/crypto-client/vault-index-types";
import { isActiveNoteEntry } from "@/lib/notes/smart-filters";

/** Resolved notes with a stored reflection (index flag set on resolve). */
export function filterRemembranceNotes(entries: VaultIndexNoteEntry[]): VaultIndexNoteEntry[] {
  return entries
    .filter(
      (entry) =>
        isActiveNoteEntry(entry) && entry.answered && Boolean(entry.hasResolvedReflection)
    )
    .sort(
      (a, b) =>
        new Date(b.resolvedAt ?? b.updatedAt).getTime() -
        new Date(a.resolvedAt ?? a.updatedAt).getTime()
    );
}
