import { parseSearchTerms } from "@/lib/notes/search-normalize";
import { cn } from "@/lib/ui/cn";

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
  testId?: string;
}

type Segment = { text: string; highlight: boolean };

function buildHighlightSegments(text: string, query: string): Segment[] {
  const terms = parseSearchTerms(query);
  if (terms.length === 0 || !text) return [{ text, highlight: false }];

  const lower = text.toLowerCase();
  const ranges: { start: number; end: number }[] = [];

  for (const term of terms) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(term, from);
      if (index === -1) break;
      ranges.push({ start: index, end: index + term.length });
      from = index + term.length;
    }
  }

  if (ranges.length === 0) return [{ text, highlight: false }];

  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), highlight: false });
    }
    segments.push({ text: text.slice(range.start, range.end), highlight: true });
    cursor = range.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false });
  }
  return segments;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightPlainSegment(text: string, terms: string[]): string {
  if (!text || terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return text.replace(pattern, '<mark class="search-highlight">$1</mark>');
}

/** Apply subtle highlights to sanitized HTML text nodes only (client-side). */
export function highlightSearchTermsInHtml(html: string, query: string): string {
  const terms = parseSearchTerms(query);
  if (!html || terms.length === 0) return html;
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith("<") ? part : highlightPlainSegment(part, terms)))
    .join("");
}

/** Client-side search term highlighting — never persisted, plain text only. */
export function HighlightedText({ text, query, className, testId }: HighlightedTextProps) {
  const segments = buildHighlightSegments(text, query);
  return (
    <span className={className} data-testid={testId}>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark key={index} className="search-highlight">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
}

interface SearchMatchBannerProps {
  query: string;
  className?: string;
}

export function SearchMatchBanner({ query, className }: SearchMatchBannerProps) {
  if (!query.trim()) return null;
  return (
    <p className={cn("text-sm text-[var(--muted)]", className)} data-testid="search-match-banner">
      Showing matches for &ldquo;{query.trim()}&rdquo;
    </p>
  );
}
