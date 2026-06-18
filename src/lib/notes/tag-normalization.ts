/** Maximum stored tag length after normalization (documented in SECURITY.md). */
export const MAX_TAG_LENGTH = 32;

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function stripHash(value: string): string {
  return value.replace(/#/g, "");
}

function toCamelCaseWords(value: string): string {
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";

  const [first, ...rest] = parts;
  const head = stripDiacritics(first).toLowerCase();
  const tail = rest
    .map((part) => {
      const clean = stripDiacritics(part);
      if (!clean) return "";
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    })
    .join("");

  return `${head}${tail}`;
}

/**
 * Normalizes a single tag input value for encrypted vault index storage.
 * Returns null when the value is empty or invalid after normalization.
 */
export function normalizeTagInput(raw: string): string | null {
  const withoutHash = stripHash(raw).trim();
  if (!withoutHash) return null;

  const normalized = toCamelCaseWords(withoutHash);
  if (!normalized) return null;
  if (normalized.length > MAX_TAG_LENGTH) return null;

  return normalized;
}

/**
 * Splits pasted or bulk tag input on commas, semicolons, or newlines,
 * normalizes each piece, and deduplicates case-insensitively.
 */
export function normalizeTagList(raw: string): string[] {
  const pieces = raw.split(/[,;\n]+/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const piece of pieces) {
    const normalized = normalizeTagInput(piece);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

/** Display prefix for tag chips — `#` is never stored in vault index values. */
export function formatTagDisplay(name: string): string {
  return `#${name}`;
}
