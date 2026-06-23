const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, DATE_OPTS);
}

const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/** Date + time label for version history (multiple edits can share a day). */
export function formatNoteDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, DATE_TIME_OPTS);
}

/** Relative timestamp for detail-rail version rows (e.g. "Today, 9:12 AM"). */
export function formatRelativeNoteDateTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const today = now.toDateString() === date.toDateString();
  if (today) return `Today, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) return `Yesterday, ${time}`;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact updated label for scan-friendly list rows. */
export function formatNoteUpdatedShort(iso: string): string {
  return `Updated ${formatNoteDate(iso)}`;
}

/** Compact created / updated line for note list and detail metadata. */
export function formatNoteListDates(createdAt: string, updatedAt: string): string {
  const created = formatNoteDate(createdAt);
  const updated = formatNoteDate(updatedAt);
  return `Created ${created} · Updated ${updated}`;
}
