/**
 * User-facing "resolved" language. Internal encrypted metadata still uses `answered`.
 */
export const RESOLVED_COPY = {
  resolved: "Resolved",
  unresolved: "Unresolved",
  markResolved: "Mark as resolved",
  markUnresolved: "Mark as unresolved",
  showResolved: "Resolved only",
  showUnresolved: "Unresolved only",
  filterLabel: "Status",
  resolvedBadge: "Resolved",
  resolvedSuccess: "You marked this note as resolved.",
  toggleLabel: "Mark as resolved",
} as const;

/** Maps internal `answered` metadata to user-facing resolved state. */
export function isNoteResolved(answered: boolean): boolean {
  return answered;
}
