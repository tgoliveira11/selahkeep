import { HighlightedText } from "@/components/notes/search-highlight";
import { cn } from "@/lib/ui/cn";

interface SearchResultSnippetProps {
  snippet: string;
  query: string;
  className?: string;
}

/** Client-side body match snippet for search results — never persisted. */
export function SearchResultSnippet({ snippet, query, className }: SearchResultSnippetProps) {
  if (!snippet.trim()) return null;
  return (
    <p
      className={cn("note-search-snippet text-sm text-[var(--muted)]", className)}
      data-testid="note-search-snippet"
    >
      <HighlightedText text={snippet} query={query} />
    </p>
  );
}
