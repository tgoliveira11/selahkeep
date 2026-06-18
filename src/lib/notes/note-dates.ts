const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, DATE_OPTS);
}

/** Compact created / updated line for note list and detail metadata. */
export function formatNoteListDates(createdAt: string, updatedAt: string): string {
  const created = formatNoteDate(createdAt);
  const updated = formatNoteDate(updatedAt);
  return `Created ${created} · Updated ${updated}`;
}
