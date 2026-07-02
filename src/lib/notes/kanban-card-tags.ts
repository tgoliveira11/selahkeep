import { normalizeTagInput } from "@/lib/notes/tag-normalization";

const CARD_TAG_RE = /\{([^}]+)\}/g;

export function parseCardTagMarkers(text: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(CARD_TAG_RE)) {
    const normalized = normalizeTagInput(match[1]);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(normalized);
  }
  return tags;
}

export function stripCardTagMarkers(text: string): string {
  return text
    .replace(CARD_TAG_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatCardTagMarkers(tags: string[] | undefined | null): string | undefined {
  const normalized = (tags ?? [])
    .map((tag) => normalizeTagInput(tag))
    .filter((tag): tag is string => Boolean(tag));
  if (normalized.length === 0) return undefined;
  return normalized.map((tag) => `{${tag}}`).join(" ");
}

export function mergeDescriptionWithCardTags(
  description: string | undefined | null,
  tags: string[] | undefined | null
): string | undefined {
  const body = stripCardTagMarkers(description ?? "");
  const tagLine = formatCardTagMarkers(tags);
  if (!body && !tagLine) return undefined;
  if (!tagLine) return body || undefined;
  if (!body) return tagLine;
  return `${body}\n${tagLine}`;
}

export function extractCardTagsFromDescription(description: string | undefined | null): string[] {
  return parseCardTagMarkers(description ?? "");
}

export function cardMatchesSearch(
  card: { title: string; description?: string; tagNames?: string[] },
  query: string
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (card.title.toLowerCase().includes(needle)) return true;
  const description = card.description ?? "";
  if (stripCardTagMarkers(description).toLowerCase().includes(needle)) return true;
  const tags = card.tagNames ?? extractCardTagsFromDescription(description);
  return tags.some((tag) => tag.toLowerCase().includes(needle));
}
