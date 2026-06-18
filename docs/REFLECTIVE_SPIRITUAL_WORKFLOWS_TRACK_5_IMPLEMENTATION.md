# Reflective and Spiritual Workflows — Priority Track 5

> Product: **SelahKeep**. Local reflective features after vault unlock only.

## Scope

| Feature | Route / surface | Storage |
|---------|-----------------|---------|
| Resolved reflection | Note detail resolve flow | Encrypted note metadata (`resolvedReflection`) |
| Timeline | `/notes/[id]` | Encrypted `lifecycleEvents` + synthetic created |
| Remembrance | `/notes/remembrance` | Index filter `hasResolvedReflection` |
| Weekly reflection | `/notes/weekly-reflection` | Client-side aggregation; optional new encrypted note |
| Prompt cards | `/notes/new`, weekly reflection | Static local array — no network |
| Views menu | `/notes` toolbar | Links to remembrance, weekly reflection, recently viewed |

## Metadata model (encrypted, backward compatible)

```ts
type NoteLifecycleEventType =
  | "created" | "updated" | "resolved" | "reopened"
  | "archived" | "unarchived" | "trashed" | "restored" | "duplicated";

type NoteLifecycleEvent = { id: string; type: NoteLifecycleEventType; occurredAt: string };

type ResolvedReflection = {
  resolvedAt: string;
  whatChanged?: string;
  howResolved?: string;
  whatToRemember?: string;
};
```

Extended on `NoteMetadataPlaintext`: optional `resolvedReflection`, `lifecycleEvents`.

Vault index mirrors for list views (no reflection plaintext in index):

- `hasResolvedReflection?: boolean`
- `resolvedAt?: string | null`

## Resolved reflection flow

1. User taps **Mark as resolved** on an unresolved note.
2. Dialog offers: **Save reflection and resolve**, **Resolve without reflection**, **Cancel**.
3. Reflection fields encrypt with note metadata on save.
4. **Reopen** adds `reopened` lifecycle event and clears `resolvedReflection` (MVP: one current reflection).

## Timeline

- Built client-side from `lifecycleEvents` after decrypt.
- Synthetic **Created** event when legacy notes lack a stored `created` event.
- **Reverse-chronological** (newest first) — matches “recent activity first” on detail.
- Progressive disclosure: **Show timeline** / **Hide timeline**.

## Remembrance

- Lists active resolved notes where `hasResolvedReflection` is true.
- Full reflection text only on note detail after decrypt.
- Empty state when none qualify.
- Hidden behind vault lock (`VaultLockedState` / `NotesVaultProtectedMessage`).

## Weekly reflection

- Week bounds: **Monday 00:00 – Sunday 23:59:59.999** in **local timezone**.
- Sections from decrypted vault index only.
- **Gratitude notes**: category name `Gratitude` (case-insensitive).
- **Carry forward** textarea is local UI state until user creates a weekly reflection note.
- **Create weekly reflection note** uses encrypted `createNote` with category `Weekly Reflection`.

## Prompt cards

Static prompts in `src/lib/notes/reflection-prompts.ts`. Contexts: `new-note`, `weekly-reflection`, `empty-state`, `remembrance`. Insert markdown heading into editor — no AI.

## Lock / clear behavior

On vault lock:

| State | Cleared / hidden |
|-------|------------------|
| Reflection dialog | Closed; metadata cleared from UI |
| Timeline | Not rendered (no decrypted metadata) |
| Remembrance / weekly pages | Locked copy only |
| Carry-forward textarea | Cleared via vault session subscription |
| Prompt insert buffers | Cleared with page state |

## Security guarantees

- No plaintext reflection, lifecycle, or prompt responses sent to server APIs.
- No AI or external network for prompts.
- Account auth and vault crypto unchanged.

## Key files

| Module | Path |
|--------|------|
| Lifecycle types/helpers | `src/lib/notes/note-lifecycle.ts` |
| Metadata normalization | `src/lib/notes/note-metadata.ts` |
| Prompts | `src/lib/notes/reflection-prompts.ts` |
| Weekly reflection | `src/lib/notes/weekly-reflection.ts` |
| Remembrance filter | `src/lib/notes/remembrance.ts` |
| Resolve dialog | `src/components/notes/resolved-reflection-dialog.tsx` |
| Timeline | `src/components/notes/note-timeline.tsx` |
| Prompt cards | `src/components/notes/prompt-cards.tsx` |
| Views menu | `src/features/notes/saved-views-menu.tsx` |
| Note mutations | `src/features/notes/use-notes.ts` |

## Tests

| Layer | Files |
|-------|-------|
| Unit | `note-lifecycle.test.ts`, `reflection-prompts.test.ts`, `weekly-reflection.test.ts`, `remembrance.test.ts` |
| Features | `reflective-workflows-track-5.test.tsx` |
| Security | `reflective-workflows-security.test.ts`, `phased-plan-tracks.test.ts` |

## Validation

```bash
rm -rf .next
npm run lint
npm run test
npm run test:coverage
npm run build
```
