export function formatNoteCount(filtered: number, total: number): string {
  const filteredLabel = filtered === 1 ? "note" : "notes";
  const totalLabel = total === 1 ? "note" : "notes";

  if (filtered === total) {
    return `${total} ${totalLabel}`;
  }

  return `${filtered} of ${total} ${totalLabel}`;
}
