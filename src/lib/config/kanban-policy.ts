import { readIntEnv } from "@/lib/env/parse";

/** Default number of encrypted Kanban snapshots retained per board. */
export const DEFAULT_KANBAN_VERSION_HISTORY_LIMIT = 50;

/**
 * Maximum number of encrypted version snapshots kept per board. Older versions
 * are pruned server-side by row count only; plaintext board data is never read.
 */
export function getKanbanVersionHistoryLimit(
  env: NodeJS.ProcessEnv = process.env
): number {
  return readIntEnv(env, "KANBAN_VERSION_HISTORY_LIMIT", DEFAULT_KANBAN_VERSION_HISTORY_LIMIT, {
    min: 1,
    max: 1000,
  });
}
