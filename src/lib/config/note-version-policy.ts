import { readIntEnv } from "@/lib/env/parse";

/** Default number of encrypted versions retained per note. */
export const DEFAULT_NOTE_VERSION_HISTORY_LIMIT = 50;

/**
 * Maximum number of encrypted version snapshots kept per note. Older versions
 * beyond this count are pruned server-side (row-count only — never inspecting
 * plaintext). See `docs/TDR_Note_Version_History.md` §7.
 */
export function getNoteVersionHistoryLimit(
  env: NodeJS.ProcessEnv = process.env
): number {
  return readIntEnv(env, "NOTE_VERSION_HISTORY_LIMIT", DEFAULT_NOTE_VERSION_HISTORY_LIMIT, {
    min: 1,
    max: 1000,
  });
}
