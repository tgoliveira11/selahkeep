import type { VaultIndexNoteEntry } from "@/lib/crypto-client/vault-index-types";

const DAILY_NOTE_TITLE_PREFIX = "Daily note — ";

/** ISO date key for daily note matching (YYYY-MM-DD). */
export function getDailyNoteDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function formatDailyNoteTitle(date = new Date()): string {
  return `${DAILY_NOTE_TITLE_PREFIX}${getDailyNoteDateKey(date)}`;
}

export function isDailyNoteTitle(title: string): boolean {
  return title.startsWith(DAILY_NOTE_TITLE_PREFIX);
}

/** Find today's daily note in decrypted vault index entries. */
export function findDailyNoteIdForDate(
  entries: VaultIndexNoteEntry[],
  date = new Date()
): string | null {
  const expected = formatDailyNoteTitle(date);
  const match = entries.find(
    (entry) => !entry.trashed && !entry.archived && entry.title === expected
  );
  return match?.id ?? null;
}
