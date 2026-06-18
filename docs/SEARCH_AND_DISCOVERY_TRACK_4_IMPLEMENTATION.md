# Search and Discovery — Priority Track 4

> Product: **SelahKeep**. Local search and discovery after vault unlock only.

## Current behavior (audit)

| Area | Before Track 4 | After Track 4 |
|------|----------------|---------------|
| Search fields | Title, category name, tag name (vault index metadata) | + decrypted note **body** (in memory after unlock) |
| Search transport | Client-only filter state on `/notes` | Unchanged — **no search query sent to server** |
| Bodies in memory | Detail/editor state, optional `bodyCache` when `decrypt_all` | + on-demand body load for active search query |
| Highlighting | None | Title, snippets, note detail (client-only) |
| Recently viewed | None (`recently-updated` smart filter uses `updatedAt` only) | `recentlyViewed` encrypted inside vault index |

## Search strategy

1. **Metadata pass** — `searchVaultIndex()` filters vault index rows (title/category/tags) immediately.
2. **Body pass** — when the search box has terms and vault is unlocked, `useNoteSearchBodies` decrypts note bodies in memory (reuses `bodyCache` when available).
3. **Matching** — `matchNoteText()` in `src/lib/notes/note-text-search.ts` with `normalizeSearchText()` / multi-term AND.
4. **Snippets** — `extractSearchSnippet()` strips markdown for display; never persisted.
5. **Highlighting** — `HighlightedText` + `highlightSearchTermsInHtml()`; cleared when query clears or vault locks.

## Encrypted persistent search index

```text
TODO_SECURITY_REVIEW_REQUIRED:
Encrypted persistent search index is deferred. Current search uses in-memory decrypted notes after vault unlock only.
```

Rationale: a separate encrypted blob would need a new AAD field, API route, and rebuild/sync pipeline. In-memory search meets MVP privacy requirements for small/medium vaults.

## Recently viewed model

- Stored as `recentlyViewed: { noteId, viewedAt }[]` inside **encrypted vault index** (no plaintext titles).
- Updated when `/notes/[id]` loads an unlocked note (`recordRecentlyViewed`).
- Smart filter chip: **Recently viewed** (`recently-viewed`).
- Cleared from UI when vault locks (decrypted index dropped).

## Lock / clear behavior

On vault lock (`subscribeVaultSession`):

| State | Cleared |
|-------|---------|
| Search query (`NoteSearchProvider`) | Yes |
| `/notes` filter state | Yes (existing) |
| Body cache (`clearNoteBodyCache`) | Yes (existing) |
| Search body map (`useNoteSearchBodies`) | Yes |
| Decrypted vault index | Yes (`useVaultIndex`) |
| Highlights / snippets | Yes (query cleared) |

## Known limitations

- Body search decrypts notes on demand while a query is active (may be slow for very large vaults).
- List mode omits body snippets (title highlight only).
- Search query is not in the URL (client state only).
- No search activity audit logging in MVP.

## Key files

| Module | Path |
|--------|------|
| Metadata + body search | `src/lib/crypto-client/note-search.ts` |
| Text match + snippet | `src/lib/notes/note-text-search.ts` |
| Normalize | `src/lib/notes/search-normalize.ts` |
| Highlight | `src/components/notes/search-highlight.tsx` |
| Body loader hook | `src/features/notes/use-note-search-bodies.ts` |
| Search context | `src/features/notes/note-search-context.tsx` |
| Recently viewed | `src/lib/notes/recently-viewed.ts` |
| Notes UI | `src/app/(vault)/notes/page.tsx` |
| Detail highlight | `src/components/notes/note-reading-view.tsx` |

## Tests

| Layer | Files |
|-------|-------|
| Unit | `search-normalize.test.ts`, `note-text-search.test.ts`, `search-highlight.test.ts`, `recently-viewed.test.ts`, `note-search.test.ts` |
| Features | `note-search-context.test.tsx` |
| Security | `notes-search-security.test.ts` |

## Validation

```bash
rm -rf .next
npm run lint
npm run test
npm run test:coverage
npm run build
```
