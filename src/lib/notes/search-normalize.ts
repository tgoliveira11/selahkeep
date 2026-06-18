/** Normalize search text: trim, lowercase, strip accents for case/accent-insensitive matching. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Split a query into AND terms (all must match). */
export function parseSearchTerms(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}
