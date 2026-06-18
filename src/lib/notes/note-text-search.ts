import { normalizeSearchText, parseSearchTerms } from "@/lib/notes/search-normalize";

export type NoteMatchField = "title" | "body" | "category" | "tag";

export interface NoteSearchableFields {
  title: string;
  body?: string;
  categoryName?: string | null;
  tagNames?: string[];
}

export interface NoteTextMatchResult {
  matches: boolean;
  matchedFields: NoteMatchField[];
  bodySnippet: string | null;
}

function fieldContains(field: string | undefined | null, term: string): boolean {
  if (!field) return false;
  return normalizeSearchText(field).includes(term);
}

function allTermsMatchInText(text: string, terms: string[]): boolean {
  const normalized = normalizeSearchText(text);
  return terms.every((term) => normalized.includes(term));
}

/** Strip markdown noise for safe plaintext snippets (client-side only, never persisted). */
export function stripMarkdownForSnippet(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+\[[ xX]]\s*/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract a short snippet around the first matching term in body text. */
export function extractSearchSnippet(body: string, query: string, maxLength = 140): string | null {
  const terms = parseSearchTerms(query);
  if (terms.length === 0) return null;

  const plain = stripMarkdownForSnippet(body);
  const normalizedPlain = normalizeSearchText(plain);
  if (!plain) return null;

  let matchIndex = -1;
  let matchTerm = "";
  for (const term of terms) {
    const index = normalizedPlain.indexOf(term);
    if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
      matchIndex = index;
      matchTerm = term;
    }
  }
  if (matchIndex === -1) return null;

  const radius = Math.max(20, Math.floor((maxLength - matchTerm.length) / 2));
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(plain.length, matchIndex + matchTerm.length + radius);
  let snippet = plain.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < plain.length) snippet = `${snippet}…`;
  return snippet;
}

export function matchNoteText(
  query: string,
  fields: NoteSearchableFields
): NoteTextMatchResult {
  const terms = parseSearchTerms(query);
  if (terms.length === 0) {
    return { matches: true, matchedFields: [], bodySnippet: null };
  }

  const matchedFields: NoteMatchField[] = [];
  const searchableChunks: { field: NoteMatchField; text: string }[] = [
    { field: "title", text: fields.title },
  ];
  if (fields.categoryName) {
    searchableChunks.push({ field: "category", text: fields.categoryName });
  }
  for (const tag of fields.tagNames ?? []) {
    searchableChunks.push({ field: "tag", text: tag });
  }
  if (fields.body !== undefined) {
    searchableChunks.push({ field: "body", text: stripMarkdownForSnippet(fields.body) });
  }

  const combined = searchableChunks.map((chunk) => normalizeSearchText(chunk.text)).join(" ");
  const matches = terms.every((term) => combined.includes(term));
  if (!matches) {
    return { matches: false, matchedFields: [], bodySnippet: null };
  }

  for (const chunk of searchableChunks) {
    if (terms.every((term) => fieldContains(chunk.text, term))) {
      if (!matchedFields.includes(chunk.field)) matchedFields.push(chunk.field);
    }
  }

  const bodySnippet =
    fields.body && terms.some((term) => fieldContains(stripMarkdownForSnippet(fields.body!), term))
      ? extractSearchSnippet(fields.body, query)
      : null;

  return { matches: true, matchedFields, bodySnippet };
}
