/** Patterns that the visual editor does not fully support. */
const UNSUPPORTED_MARKDOWN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /^#{3,}\s/m, label: "headings below H2" },
  { pattern: /!\[[^\]]*\]\([^)]+\)/, label: "images" },
  { pattern: /^\|.+\|/m, label: "tables" },
  { pattern: /<(?!\/?(code|pre)\b)[a-z][^>]*>/i, label: "raw HTML" },
  { pattern: /^\s*```/m, label: "fenced code blocks" },
  { pattern: /~~.+~~/, label: "strikethrough" },
];

export function findUnsupportedMarkdownFeatures(markdown: string): string[] {
  const found = new Set<string>();
  for (const { pattern, label } of UNSUPPORTED_MARKDOWN_PATTERNS) {
    if (pattern.test(markdown)) {
      found.add(label);
    }
  }
  return [...found];
}

export function normalizeMarkdownForCompare(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function getMarkdownConversionWarning(markdown: string): string | null {
  const unsupported = findUnsupportedMarkdownFeatures(markdown);
  if (unsupported.length === 0) return null;
  return `Switching to Visual mode may simplify or drop unsupported formatting: ${unsupported.join(", ")}.`;
}

export function hasMarkdownRoundtripLoss(original: string, roundtripped: string): boolean {
  return normalizeMarkdownForCompare(original) !== normalizeMarkdownForCompare(roundtripped);
}
