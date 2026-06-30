# TDR — Note Kanban Boards (encrypted, versioned, generated from notes)

## 1. Status

**Proposed.** Awaiting confirmation of the open assumptions in §19. No code written yet.

Decisions already taken (with the product owner):

| # | Decision | Choice |
|---|----------|--------|
| D1 | How "activities" are recognised in a note | **Deterministic, on-device** markdown parsing (no LLM) |
| D2 | Note ↔ board relationship | **Generated from the note once, then an independent encrypted entity** (re-sync is explicit/on-demand) |
| D3 | Columns | **Customisable** (add / rename / reorder / delete; per-column "done" flag) |
| D4 | Resolving the note when all cards are done | **Suggest / prompt** via the existing resolved-reflection flow (not automatic) |
| D5 | Standalone boards (not tied to a note) | **In scope.** Both note-bound and standalone boards are supported |
| D6 | Card fields | **Add due date, labels, and priority** to cards (still no assignees/sharing) |

---

## 2. Executive summary

Add a **Kanban board** that either **belongs to a note** or **stands alone**. A note-bound board is **generated from the note's content** (deterministically parsing checklist items / list items / headings into cards) and can then be edited independently; a standalone board is created empty/from a template. Boards have **customisable columns**, cards with **due date, labels, and priority**, **full version history** (immutable snapshots, restore, diff) exactly like note version history, and are **end-to-end encrypted** — note-bound boards under the note's existing **Note Key**, standalone boards under a per-board **Board Key** wrapped by the User Vault Key. No plaintext ever reaches the database or the API.

When every card sits in a column flagged "done", the app **suggests** marking the note resolved using the existing `ResolvedReflectionDialog`. The board's presence and a small progress count are surfaced on the encrypted vault index (`hasKanban`, `kanbanTotal`, `kanbanDone`) so the notes list can show a progress chip without decrypting the board.

This mirrors three existing subsystems almost 1:1:
- **Encryption**: `src/lib/crypto-client/note-versions.ts` (Note Key reuse + AAD bound to a unique id).
- **Versioning**: `note_versions` table + `note-version-service.ts` + `note-version-repository.ts` (+ `note-version-policy.ts` retention).
- **Resolve/index**: `note-lifecycle.ts` (`applyNoteResolved`), `use-notes.ts` (`resolveNoteWithReflection`), `vault-index-types.ts` (`VaultIndexNoteEntry`).

---

## 3. Goals / non-goals

### Goals
- Kanban boards that are either **note-bound** (one per note, generated from the note's recognised activities, then freely editable) or **standalone** (not tied to any note).
- Customisable columns; default status **To Do** for newly recognised/created cards.
- Cards carry **due date, labels (board-level palette), and priority**, in addition to title + markdown description + status.
- **History + versioning** with restore and a diff, matching note version history.
- **All board content encrypted at rest** — note-bound under the note's Note Key, standalone under a per-board Board Key wrapped by the UVK; **no plaintext in DB, API payloads, logs, or admin tooling** (honours the sentinel-phrase contract).
- When a **note-bound** board's cards are all in a "done" column → **suggest** resolving the note (reuse the reflection dialog); offer to **reopen** if a card later leaves "done".
- Works on **mobile** (touch), consistent with the recent mobile hardening.

### Non-goals (v1)
- **No LLM/NLP** of any kind (deterministic parsing only).
- **No two-way live sync** between note text and board (re-generation is explicit).
- No multi-user / sharing / **assignees** / WIP limits (this is a private, single-user journaling app).
- No real-time collaboration.

---

## 4. Background: the architecture we are mirroring

(From the codebase analysis — exact references so implementation is mechanical.)

### 4.1 Key hierarchy & encryption
- **User Vault Key (UVK)**: AES-256-GCM, Argon2id-derived (password/recovery phrase) or passkey-PRF; held in client session memory only (`src/lib/crypto-client/vault-session.ts`, `getSessionVaultKey()`).
- **Per-note Note Key**: generated per note, wrapped under the UVK (`wrapNoteKey`/`unwrapNoteKey` in `src/lib/crypto-client/note-key.ts`), AAD-bound to `noteId` with field `note_key`.
- **`EncryptedPayload`** (`src/lib/validation/encrypted-payload.ts`):
  ```ts
  { version: "enc-v1"; alg: "AES-GCM"; iv: string /*b64url 12B*/; ciphertext: string /*b64url*/;
    aad: { userId: string; resourceId: string; field: <enum> } }
  ```
- **AEAD**: `encryptField`/`decryptField` (`src/lib/crypto-client/aes-gcm.ts`); AAD is canonical JSON `{field, resourceId, userId}` (`aad.ts` `canonicalAadString`) authenticated (not encrypted).
- **Versions reuse the Note Key**: `encryptNoteVersion(...)` unwraps the note's key, encrypts content AAD-bound to a unique `versionId`, and reuses the existing wrapped-key payload (bound to `noteId`). This is the exact pattern the board will copy.

### 4.2 Versioning subsystem
- `note_versions` (`src/lib/db/app-schema.ts`): `id` (client `versionId`), `note_id`, `vault_id`, `version_number` (server, monotonic), `encryptedMetadata`/`encryptedBody`/`encryptedWrappedNoteKey`, `bodyEncryptionVersion`, `created_at`; indexes on `(note_id, version_number)` and `(note_id, created_at)`. Migration `0012`.
- `note-version-service.ts`: `create` (assert AAD → insert with `version_number = max+1` → `pruneBeyondLimit` in a transaction; best-effort; maps missing table `42P01` → `VersionsUnavailableError` → 503). `list`, `getById`.
- `note-version-repository.ts`: `create`, `findByNoteId` (desc), `findByIdForNote`, `maxVersionNumber`, `pruneBeyondLimit` (row-count only, never inspects plaintext).
- Retention: `src/lib/config/note-version-policy.ts` — `NOTE_VERSION_HISTORY_LIMIT` (default 50, range 1–1000).
- Client: `src/features/notes/use-notes.ts` `appendNoteVersionSnapshot()` (generates `versionId`, encrypts, POSTs, swallows errors so it never fails the primary save).
- Diff: dependency-free LCS line diff, client-side (`docs/TDR_Note_Version_History.md`).

### 4.3 Resolve & vault index
- Resolve: `answered: boolean` in encrypted metadata; `applyNoteResolved`/`applyNoteReopened` (`src/lib/notes/note-lifecycle.ts`); `resolveNoteWithReflection` / `toggleNoteResolved` (`use-notes.ts`); `ResolvedReflectionDialog` (`src/components/notes/resolved-reflection-dialog.tsx`).
- Vault index entry `VaultIndexNoteEntry` (`src/lib/crypto-client/vault-index-types.ts`) already carries derived flags (`hasChecklist`, `isDailyNote`, `hasResolvedReflection`, `resolvedAt`) computed in `metadataToIndexEntry()` (`src/lib/notes/note-metadata.ts`) and stored inside the **encrypted** index. We add `hasKanban` here.

### 4.4 Activity source already present
- Checklists live in the markdown body: `src/lib/notes/markdown-checklist.ts` — regex `^(\s*[-*+]\s+)\[([ xX])\](.*)$`, `countChecklistItems`, `toggleChecklistAtIndex`. The board generator reuses this.

---

## 5. Data model (plaintext shapes — only ever exist decrypted, in memory)

```ts
// src/lib/notes/kanban-types.ts  (plaintext; serialised → encrypted as one blob)

export type KanbanPriority = "low" | "medium" | "high" | "urgent";

export interface KanbanColumnPlaintext {
  id: string;            // uuid
  title: string;         // e.g. "To Do"
  order: number;         // 0-based, contiguous
  isDoneColumn: boolean; // counts toward "all done" completion (D3: explicit "done" definition)
  wipLimit?: number;     // reserved; unused in v1
}

export interface KanbanLabelPlaintext {
  id: string;            // uuid
  name: string;
  color: string;         // a design-system token key (e.g. "lilac", "success", "danger") — not raw hex
}

export interface KanbanCardPlaintext {
  id: string;            // uuid
  columnId: string;      // FK → column.id
  title: string;         // short text
  description?: string;  // optional markdown (sanitised on render like note bodies)
  order: number;         // order within its column
  // D6 — card fields:
  dueDate?: string | null;        // ISO date "YYYY-MM-DD" (optional)
  priority?: KanbanPriority | null;
  labelIds?: string[];            // reference board.labels[].id
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
  // Provenance for idempotent re-generation (never user-facing):
  source?: { kind: "checklist" | "list" | "heading" | "manual"; key?: string };
}

export interface KanbanBoardPlaintext {
  schemaVersion: 1;
  boardId: string;       // uuid; stable; AAD resourceId for the *current* board blob
  scope: "note" | "standalone";
  noteId: string | null; // owning note (null for standalone boards)
  title: string;         // board title (required for standalone; for note-bound may mirror/override the note title)
  columns: KanbanColumnPlaintext[];
  cards: KanbanCardPlaintext[];
  labels: KanbanLabelPlaintext[];                   // board-level label palette
  generatedFrom?: { at: string; bodyHash: string }; // note-bound only: sha-256 of the note body at last generation
  createdAt: string;
  updatedAt: string;
}
```

All card fields (`dueDate`, `priority`, `labelIds`) and the label palette live **inside the encrypted board blob** — they add **no plaintext columns** and **no schema change**; the server never sees due dates, labels, or priorities.

**Completion rule (D3 + D4):** the board is "complete" iff `cards.length > 0` **and** every card's column has `isDoneColumn === true`. Default board has exactly one done column ("Done"); the user may flag additional/renamed columns as done. The UI must prevent removing the last done column (otherwise completion can never be reached).

**Default generated board:**
- `To Do` (`order:0`, `isDoneColumn:false`) — default for new/unchecked cards.
- `In Progress` (`order:1`, `isDoneColumn:false`).
- `Done` (`order:2`, `isDoneColumn:true`) — receives recognised `[x]` checked items.

The whole `KanbanBoardPlaintext` is serialised to JSON and encrypted as **one** blob. (Columns+cards are small; a single blob keeps versioning/diff trivial. If boards ever grow huge, §18 covers splitting.)

---

## 6. Database schema

New migration **`drizzle/0014_note_kanban.sql`** (next after `0013`). Two tables mirroring `note_versions`.

```sql
-- Current board: at most one per note (note-bound) OR standalone (note_id NULL).
CREATE TABLE note_kanban_boards (
  id                        uuid PRIMARY KEY,                              -- boardId (client-generated)
  note_id                   uuid REFERENCES notes(id) ON DELETE CASCADE,   -- NULL for standalone boards
  vault_id                  uuid NOT NULL REFERENCES user_vaults(id) ON DELETE CASCADE,
  encrypted_board           jsonb NOT NULL,   -- AAD field=note_kanban_board, resourceId=boardId
  encrypted_wrapped_key     jsonb NOT NULL,   -- note-bound: field=note_key,resourceId=noteId
                                              -- standalone: field=note_kanban_key,resourceId=boardId
  board_encryption_version  text  NOT NULL,   -- "enc-v1"
  version_number            integer NOT NULL DEFAULT 1,                    -- latest snapshot number
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_note_kanban_boards_vault_id ON note_kanban_boards(vault_id);
-- One board per note, but many standalone boards:
CREATE UNIQUE INDEX idx_note_kanban_boards_note_id ON note_kanban_boards(note_id) WHERE note_id IS NOT NULL;

-- Immutable, append-only history snapshots.
CREATE TABLE note_kanban_versions (
  id                        uuid PRIMARY KEY,                              -- versionId (client-generated)
  board_id                  uuid NOT NULL REFERENCES note_kanban_boards(id) ON DELETE CASCADE,
  note_id                   uuid REFERENCES notes(id) ON DELETE CASCADE,   -- NULL for standalone boards
  vault_id                  uuid NOT NULL REFERENCES user_vaults(id) ON DELETE CASCADE,
  version_number            integer NOT NULL,                             -- monotonic per board, from 1
  encrypted_board           jsonb NOT NULL,   -- AAD field=note_kanban_version, resourceId=versionId
  encrypted_wrapped_key     jsonb NOT NULL,   -- same scope rule as above
  board_encryption_version  text  NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_note_kanban_versions_board_id_version ON note_kanban_versions(board_id, version_number);
CREATE INDEX idx_note_kanban_versions_board_id_created ON note_kanban_versions(board_id, created_at);
```

Drizzle definitions go in `src/lib/db/app-schema.ts` next to `notes`/`note_versions`. `note_id` is nullable (standalone boards) with a **partial unique index** so a note has at most one board while a vault can hold many standalone boards. `ON DELETE CASCADE` from `notes` (note-bound) and `user_vaults` (all) removes the board + history automatically.

---

## 7. Cryptography design

### 7.1 New AAD fields
Extend the `field` enum in `src/lib/validation/encrypted-payload.ts` (and the zod `aadSchema`):
```
"note_kanban_board"    // current board blob, resourceId = boardId
"note_kanban_version"  // version snapshot blob, resourceId = versionId
"note_kanban_key"      // wrapped Board Key for STANDALONE boards, resourceId = boardId
```
Wrapped-key field depends on scope:
- **Note-bound** board → reuse `note_key`, resourceId = `noteId` (the note's wrapped Note Key, copied as-is).
- **Standalone** board → `note_kanban_key`, resourceId = `boardId` (a freshly generated **Board Key** wrapped under the UVK).

Either way the **board content** is `note_kanban_board` / `note_kanban_version` (resourceId = boardId / versionId), encrypted under whichever key the wrapped-key payload yields.

### 7.2 Client crypto module — `src/lib/crypto-client/kanban.ts`
Mirrors `note-versions.ts`, but the board key has two sources depending on scope.

```ts
export interface EncryptedKanbanBoardPayload {
  id: string;                          // boardId
  encryptedBoard: EncryptedPayload;    // field=note_kanban_board, resourceId=boardId
  encryptedWrappedKey: EncryptedPayload; // note_key@noteId (note-bound) | note_kanban_key@boardId (standalone)
  boardEncryptionVersion: "enc-v1";
}

// Standalone boards: generate a fresh Board Key and wrap it under the UVK.
export async function wrapBoardKey(
  userId: string, boardId: string, boardKey: CryptoKey, vaultKey?: CryptoKey,
): Promise<EncryptedPayload> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");
  const raw = bytesToBase64Url(await exportAesKey(boardKey));
  return encryptField(raw, key, { userId, resourceId: boardId, field: "note_kanban_key" });
}
export async function unwrapBoardKey(wrapped: EncryptedPayload, vaultKey?: CryptoKey): Promise<CryptoKey> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");
  verifyPayloadAad(wrapped, { userId: wrapped.aad.userId, resourceId: wrapped.aad.resourceId, field: "note_kanban_key" });
  return importAesKey(base64UrlToBytes(await decryptField(wrapped, key)));
}

// Resolve the content key from whichever wrapped-key payload the board carries.
async function unwrapContentKey(wrapped: EncryptedPayload, vaultKey?: CryptoKey): Promise<CryptoKey> {
  return wrapped.aad.field === "note_kanban_key"
    ? unwrapBoardKey(wrapped, vaultKey)
    : unwrapNoteKey(wrapped, vaultKey); // field === "note_key"
}

export async function encryptKanbanBoard(
  userId: string, boardId: string, board: KanbanBoardPlaintext,
  wrappedKey: EncryptedPayload, vaultKey?: CryptoKey,
): Promise<EncryptedKanbanBoardPayload> {
  const contentKey = await unwrapContentKey(wrappedKey, vaultKey);
  const encryptedBoard = await encryptField(JSON.stringify(board), contentKey,
    { userId, resourceId: boardId, field: "note_kanban_board" });
  return { id: boardId, encryptedBoard, encryptedWrappedKey: wrappedKey, boardEncryptionVersion: "enc-v1" };
}

export async function decryptKanbanBoard(
  encryptedBoard: EncryptedPayload, wrappedKey: EncryptedPayload, vaultKey?: CryptoKey,
): Promise<KanbanBoardPlaintext> {
  const contentKey = await unwrapContentKey(wrappedKey, vaultKey);
  verifyPayloadAad(encryptedBoard, { userId: encryptedBoard.aad.userId,
    resourceId: encryptedBoard.aad.resourceId, field: "note_kanban_board" });
  return JSON.parse(await decryptField(encryptedBoard, contentKey)) as KanbanBoardPlaintext;
}
```

- **Creating a note-bound board**: pass the note's existing `encryptedWrappedNoteKey` (field `note_key`).
- **Creating a standalone board**: `generateAesKey()` → `wrapBoardKey(...)` → pass that as `wrappedKey`.
- Version variants (`encryptKanbanVersion`/`decryptKanbanVersion`) are identical except `field: "note_kanban_version"` and `resourceId: versionId` for the content; the wrapped-key payload is reused unchanged.

### 7.3 Server validation
- **Plaintext rejection**: extend `PLAINTEXT_FORBIDDEN_FIELDS` (`src/lib/validation/notes.ts`) with `kanban, board, columns, cards, column, card, boardState, labels, priority, dueDate, title`. Routes call `assertNoPlaintextNoteFields(body)` first (existing helper).
- **Schemas** — `src/lib/validation/kanban.ts`:
  ```ts
  export const createKanbanBoardSchema = z.object({
    id: z.string().uuid(),
    noteId: z.string().uuid().nullable(),   // null for standalone boards
    encryptedBoard: encryptedPayloadSchema,
    encryptedWrappedKey: encryptedPayloadSchema,
    boardEncryptionVersion: z.literal("enc-v1"),
  });
  export const updateKanbanBoardSchema = createKanbanBoardSchema.omit({ noteId: true }); // full-blob replace
  export const createKanbanVersionSchema = z.object({ /* id, encryptedBoard, encryptedWrappedKey, boardEncryptionVersion */ });
  ```
- **AAD assertions** — `src/modules/security/policies/aad-validation.ts` (scope-aware):
  ```ts
  // content always → boardId; wrapped key → noteId (note-bound) or boardId (standalone)
  assertKanbanBoardAad(userId, boardId, noteId | null, input);
  assertKanbanVersionAad(userId, boardId, versionId, noteId | null, input);
  // internally: if noteId != null → expect wrappedKey {field:"note_key", resourceId:noteId};
  //             else             → expect wrappedKey {field:"note_kanban_key", resourceId:boardId}
  ```
  For note-bound boards the server also verifies the note exists and belongs to the caller's vault (it already does this for note versions).
- **Size guards**: reject `encryptedBoard.ciphertext` over a cap (e.g. 512 KiB) — same spirit as note-version size checks.

**Server stores ciphertext only.** It never sees columns, card titles, or counts. Progress counts shown in the UI come from the **encrypted vault index** (decrypted client-side) or from decrypting the board client-side.

---

## 8. API surface

Boards (note-bound **and** standalone) live under a unified `/api/kanban/*` resource. Thin handlers delegate to a service; auth via `requireSessionUser()`; plaintext-rejected; AAD-validated; `42P01` → 503.

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/kanban` | List the vault's boards (encrypted summaries); `?noteId=:id` filters to a note's board; `?scope=standalone` lists standalone boards |
| `POST` | `/api/kanban` | Create a board (encrypted; `noteId` null ⇒ standalone) + version 1 |
| `GET` | `/api/kanban/:boardId` | Current board (encrypted) |
| `PUT` | `/api/kanban/:boardId` | Replace current board blob (encrypted); optionally append a version |
| `DELETE` | `/api/kanban/:boardId` | Delete board + its versions |
| `GET` | `/api/kanban/:boardId/versions` | List versions (encrypted, newest first) |
| `GET` | `/api/kanban/:boardId/versions/:versionId` | One encrypted version snapshot |

Note detail fetches a note's board via `GET /api/kanban?noteId=:id` (returns the single board or empty). A standalone "Boards" list page uses `GET /api/kanban?scope=standalone`.

Service/repo: `src/modules/notes/services/kanban-service.ts` + `repositories/kanban-repository.ts` (board CRUD — enforces the partial-unique note constraint, ownership by vault, and the note-exists check when `noteId` is set), and `kanban-version-service.ts`/`kanban-version-repository.ts` — copied from the note-version equivalents, including `maxVersionNumber` and `pruneBeyondLimit`.

Retention: `src/lib/config/kanban-policy.ts` — `KANBAN_VERSION_HISTORY_LIMIT` (default 50, range 1–1000), mirroring `note-version-policy.ts`.

---

## 9. Client architecture

```
src/lib/notes/kanban-types.ts            // plaintext types (§5)
src/lib/notes/kanban-from-note.ts        // deterministic recogniser (§10)
src/lib/notes/kanban-progress.ts         // completion + counts (pure)
src/lib/crypto-client/kanban.ts          // encrypt/decrypt board + version + Board Key wrap (§7.2)
src/lib/validation/kanban.ts             // zod schemas
src/lib/api-client/kanban.ts             // fetch wrappers (list / CRUD / versions)
src/features/notes/use-kanban.ts         // hook: load/create/update/regenerate/restore + version snapshots
src/features/kanban/                      // UI: KanbanBoard, KanbanColumn, KanbanCard, AddColumn,
                                          //     GenerateFromNotePanel, KanbanCardDialog (due/labels/priority),
                                          //     KanbanLabelManager, KanbanVersionHistory, KanbanBoardList
src/app/(vault)/kanban/page.tsx          // standalone boards list ("Boards")
src/app/(vault)/kanban/[boardId]/page.tsx// board view (note-bound and standalone share this)
```

`use-kanban.ts` responsibilities (mirroring `use-notes.ts`):
- `loadBoard(boardId)` → GET → `decryptKanbanBoard`. `loadBoardForNote(noteId)` → `GET /api/kanban?noteId=`.
- `createNoteBoard(noteId, board)` → `encryptKanbanBoard` reusing the note's wrapped Note Key → POST (`noteId` set) → version 1 → update the note's index entry (`hasKanban/kanbanTotal/kanbanDone`).
- `createStandaloneBoard(board)` → `generateAesKey()` → `wrapBoardKey()` → `encryptKanbanBoard` → POST (`noteId: null`) → version 1 → add a standalone-board index entry (§14).
- `saveBoard(board)` → debounced (~1s) `encryptKanbanBoard` → PUT (current blob); reuses the board's existing wrapped-key payload.
- `appendKanbanVersionSnapshot(...)` → coalesced (~10s idle, on blur, on navigation) best-effort POST (swallow errors, like notes).
- `regenerateFromNote(noteId)` → note-bound only: re-parse note, merge (idempotent, §11).
- `restoreVersion(boardId, versionId)` → decrypt snapshot → set as current → save → append a new version (history never rewritten).
- Vault-session aware: clears in-memory board on lock (`subscribeVaultSession`), like `useNoteListExcerpts`.

---

## 10. Activity recognition (deterministic, on-device) — `kanban-from-note.ts`

Pure function over the note's markdown body. **No network, no LLM.** Reuses `markdown-checklist.ts` patterns.

Recognition rules (configurable via options, sensible defaults):
1. **Checklist items** `- [ ] text` / `- [x] text` → one card each.
   - `[ ]` → **To Do** column; `[x]` → **Done** column.
   - `source = { kind: "checklist", key: normalize(text) }`.
2. **Plain list items** (`- `, `* `, `+ `, `1.`) that are **not** checkboxes → To Do cards (`source.kind="list"`). *(default on; toggle in the generate panel)*
3. **Headings** (`##`, `###`) immediately preceding a list → used as a label prefix on those cards (kept in `description` or a `[Section] ` title prefix). Headings do **not** create columns in v1 (columns are user-managed).
4. Lines that are empty / pure prose / code blocks / quotes → ignored.

Output: a proposed `KanbanBoardPlaintext` (default 3 columns; cards distributed per rules; `order` contiguous; `generatedFrom.bodyHash` set). The user sees a **preview** (count + the proposed cards) before the board is created — they can drop noise and confirm.

`normalize(text)` (trim, collapse whitespace, strip trailing punctuation, lowercase) gives a stable `source.key` used for **idempotent re-generation** (§11) and de-duplication.

---

## 11. Generation & re-sync semantics (D2: generated, then independent)

- **Generate**: from the note detail, if `kanban-from-note` finds ≥1 activity, show **"Generate kanban"**. Creates the board (preview → confirm). The note body is **unchanged**.
- **Independent editing**: all board edits (add/move/rename/reorder cards & columns, edit card description) persist only to the board entity. Toggling a checklist in the note later does **not** change the board.
- **Re-generate (explicit, on demand)**: a **"Re-sync from note"** action re-parses the note and **merges additively**:
  - New recognised activities (by `source.key` not already present) → appended as **To Do** cards.
  - Existing cards are **never moved or deleted** by re-sync (the user owns the board).
  - Removed note lines do **not** remove cards.
  - Show a summary ("3 new cards added; nothing removed"); update `generatedFrom.bodyHash`.
- The note detail can show a subtle hint ("note changed since the board was generated") by comparing the current body hash to `generatedFrom.bodyHash` — purely informational.

This keeps the model simple and predictable, and avoids destructive surprises. (Two-way live sync is explicitly out of scope — §3.)

---

## 12. Versioning (history like notes)

- **Current board** = `note_kanban_boards` row (mutable, replaced via PUT). **History** = append-only `note_kanban_versions`.
- **Snapshot cadence (avoids drag-drop version explosion):** the current blob is saved on each change (debounced ~1s), but a **version snapshot is coalesced** — appended after ~10s of inactivity, on board blur, and on navigation away — analogous to how notes snapshot on content save rather than per keystroke. Each snapshot is a full board blob (small).
- **`version_number`**: server-assigned `max+1` per board (`maxVersionNumber`), monotonic.
- **Restore**: pick a version → decrypt → set as current → save → append a new version (never rewrite history). Same as notes.
- **Diff**: reuse the dependency-free client diff. Because the board is JSON, render a **semantic diff** (added/removed/moved cards, column renames) computed client-side from two decrypted snapshots — friendlier than a raw-JSON line diff. (Falls back to JSON line-diff if needed.)
- **Retention**: `pruneBeyondLimit(boardId, vaultId, KANBAN_VERSION_HISTORY_LIMIT)` (row-count only), in the create transaction. Best-effort: a failed snapshot never fails the board save.
- **Graceful degradation**: if `note_kanban_versions` is missing (`42P01`), history degrades to empty and board CRUD still works (the `VersionsUnavailableError`→503 pattern).

---

## 13. Resolve / reopen integration (D4: suggest)

**Applies to note-bound boards only.** Standalone boards have no note to resolve — completion just shows a "100% done" badge.

- On every board change, compute completion via `kanban-progress.ts` (`cards.length>0 && cards.every(c => columnById[c.columnId].isDoneColumn)`).
- **All done → suggest**: show a calm prompt ("All tasks are done — mark this note resolved?") that opens the existing **`ResolvedReflectionDialog`** → `resolveNoteWithReflection(noteId, fields | null)`. Never auto-resolves. The prompt is shown once per "transition into complete" (don't nag).
- **Reopen**: if the note is currently resolved and a card moves **out** of a done column (board becomes incomplete), offer **"Reopen note?"** → `toggleNoteResolved(noteId, false)` (`applyNoteReopened`). Also a suggestion, not automatic.
- Resolving/reopening here goes through the **existing** lifecycle/index code paths (no new resolve logic), so the note timeline records the `resolved`/`reopened` lifecycle events as today.

---

## 14. Vault index integration

Add to `VaultIndexNoteEntry` (`src/lib/crypto-client/vault-index-types.ts`) — stored inside the **encrypted** index:
```ts
hasKanban?: boolean;
kanbanTotal?: number;   // card count
kanbanDone?: number;    // cards in done columns
```
Computed when a **note-bound** board is saved (client-side) and written via `updateVaultIndexEntry(index, noteId, { hasKanban, kanbanTotal, kanbanDone })` (existing `syncVaultIndex` flow in `use-notes.ts`). Enables:
- A **progress chip** on note cards ("▦ 3/5") without decrypting the board.
- A **smart filter** "Has kanban" / "Kanban in progress" (extend `src/lib/notes/smart-filters.ts`, like the existing `checklist` filter).

**Standalone boards** are not notes, so they get their own light index — a new optional array on the vault index plaintext:
```ts
// VaultIndexPlaintext
kanbanBoards?: Array<{ id: string; title: string; total: number; done: number; updatedAt: string }>;
```
maintained client-side alongside note entries (added/updated/removed when a standalone board is created/saved/deleted). This powers the **"Boards" list page** instantly without fetching+decrypting every board. The list endpoint `GET /api/kanban?scope=standalone` remains the source of truth (the index is a fast cache; rebuildable by decrypting board titles).

A new index schema-version bump in `decryptVaultIndex` (it already migrates V1→V2→V3): add the new optional note fields **and** `kanbanBoards`, defaulting to undefined/[] — backward compatible, no re-encrypt needed.

---

## 15. UI / UX (Stillness design system)

- **Entry points (note-bound)** — note detail `/(vault)/notes/[id]`: a **Kanban** action in the note action bar (`note-detail-action-bar.tsx`); when the note has activities but no board, a **"Generate kanban"** CTA; when a board exists, the action shows the progress chip and links to the board.
- **Entry points (standalone)** — a **"Boards"** destination in the desktop sidebar (`app-sidebar.tsx`) and mobile bottom nav (`mobile-bottom-nav.tsx`), routing to `/(vault)/kanban` (list of standalone boards + "New board"). Both note-bound and standalone boards open at `/(vault)/kanban/[boardId]`.
- **Board route** `/(vault)/kanban/[boardId]`: header (board title — editable for standalone; "back to note" for note-bound + back), columns rendered as Stillness cards (hairline borders, radius, outlined chips), an **Add column** affordance, per-column menu (rename, mark/unmark "done", delete with last-done-column guard, reorder).
- **Cards** show title, a markdown excerpt, and chips for **due date** (with overdue styling), **priority** (low/medium/high/urgent), and **labels** (outlined, design-token colours). Clicking opens a **card dialog**: title, markdown description (sanitised render via the existing `MarkdownPreview`/sanitiser), due-date picker, priority selector, and label multi-select. A **`KanbanLabelManager`** edits the board's label palette (name + token colour).
- **Move / drag**:
  - Desktop: pointer drag-and-drop between/within columns.
  - **Mobile (touch-first):** do **not** rely on finicky touch DnD alone — every card has a **"Move"** menu (choose column) and up/down reorder controls; columns scroll horizontally with snap, or collapse to a single-column view with a column switcher. (Consistent with the recent mobile work; verified the same way — code + tests, since we can't drive a device here.)
- **History**: a **Kanban version history** panel mirroring the note version-history UI (numbered snapshots, timestamps, Current badge, Restore, compare/diff).
- **Empty/locked/error states**: reuse the shared patterns (locked → the standard vault-locked CTA to `/vault/unlock`; board content only renders when the vault is unlocked).
- **Motion/colour**: existing calm tokens; columns use outlined chips for the "done" marker; no new colour system.

---

## 16. Security & privacy

- **Encryption**: board + every version encrypted under the content key — the note's **Note Key** (note-bound) or a per-board **Board Key** wrapped under the UVK (standalone). AAD binds content→`boardId`/`versionId`, wrapped key→`noteId` (note-bound) or `boardId` (standalone), all to `userId`. Prevents the server swapping ciphertext between notes/boards/versions. The Board Key is never persisted unwrapped; like the Note Key it only exists in memory after the vault unlocks.
- **No plaintext anywhere**: DB stores ciphertext jsonb only; APIs reject plaintext fields and validate AAD; progress counts live only in the encrypted index; logs/admin never see content.
- **Sentinel-phrase tests**: `SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345` placed in card titles/descriptions must never appear in DB rows, API responses, or logs (extend the existing sentinel security tests to the kanban tables/routes).
- **Threat-model update**: add a short section to `docs/THREAT_MODEL_Private_Letters_Vault.md` covering the new resource type (same guarantees as notes/versions; client-only decryption; board reorder is a client operation on decrypted state, re-encrypted on save).
- **Recognition stays on-device**: `kanban-from-note` runs in the browser on already-decrypted note text; nothing is sent anywhere. (This is why D1 = deterministic — an external LLM would have violated the no-plaintext-egress guarantee.)

---

## 17. Testing strategy (matches `docs/TESTING_STRATEGY.md`, ≥90% gate)

- **Unit** (`src/test/unit/`): `kanban-from-note` (checklist/list/heading recognition, normalisation, idempotent re-sync merge), `kanban-progress` (completion edge cases: no cards, multiple done columns, last-done-column guard), crypto round-trip for **both scopes** (`encrypt/decryptKanbanBoard`/`Version`; `wrap/unwrapBoardKey`; `unwrapContentKey` picks the right path by AAD field), card fields round-trip (due/labels/priority preserved), AAD canonicalisation, version `version_number` assignment.
- **Security** (`src/test/security/`): plaintext rejection for new fields (incl. `labels`, `priority`, `dueDate`, `title`); AAD tampering (swap board ciphertext between two boards / two versions, and swap a standalone board's wrapped key → decrypt + server assert reject); a standalone board's content must not decrypt with a different board's Board Key; sentinel-phrase (in card title/description/label) never persisted in either table or any API response.
- **Services** (`src/test/services/`): board create/update/delete; version create + `pruneBeyondLimit` retention; `42P01` → `VersionsUnavailableError`; best-effort snapshot failure does not fail save.
- **API** (`src/test/api/`): auth required; schema validation; AAD assertions; 404 when no board; 503 when table missing.
- **Features** (`src/test/features/`): generate-from-note preview → create; move card → progress updates; all-done → resolve **suggestion** (opens reflection dialog); card leaves done → reopen suggestion; restore version; mobile **Move** menu reachable (controls present, like the unlock review). a11y on board/columns/cards.

---

## 18. Performance & limits

- **Single blob** per board keeps reads/writes/versioning simple; cap **~500 cards / board** and **~512 KiB ciphertext** (validated client + server). If a board exceeds this, surface a friendly limit (rare for personal use). Splitting cards into per-card encrypted rows is possible later but unnecessary for v1.
- **Debounced save + coalesced snapshots** prevent version explosion from drag-drop.
- **List view**: progress chips come from the index (no board decryption); the board is decrypted only when opened.

---

## 19. Open questions / assumptions to confirm

- ✅ **Standalone boards** — confirmed in scope (D5); key model + schema + API + nav updated accordingly.
- ✅ **Card fields** — confirmed: due date, labels, priority added (D6).

Remaining to confirm (sensible defaults assumed):
1. **Recognition breadth (D1):** cards come from **checklist items + plain list items** by default (headings as labels, not columns). If notes describe tasks as free prose, deterministic parsing under-recognises — an **opt-in on-device LLM** could be a future enhancement (kept private).
2. **Diff style:** semantic board diff (added/removed/moved cards, column/label changes) vs raw JSON line diff — semantic preferred; confirm acceptable.
3. **"Done" definition with custom columns:** per-column `isDoneColumn` flag + guard that ≥1 done column exists. Confirm (vs "the last column is always done").
4. **Standalone board creation:** start empty vs from a small template (To Do/In Progress/Done seeded). Proposed: seeded default columns, no cards.
5. **Labels palette:** per-board (proposed) vs a vault-wide shared palette. Proposed: per-board for v1 (simpler; no cross-board coupling).

---

## 20. Rollout plan

- **Feature flag** `NEXT_PUBLIC_KANBAN_ENABLED` (default off until shipped), mirroring `NEXT_PUBLIC_VOICE_NOTES_ENABLED`.
- **Migration `0014_note_kanban.sql`**; CRUD degrades gracefully pre-migration (`42P01`).
- **Vault index** new optional fields are backward-compatible (no re-encrypt; defaulted on read).
- **Docs**: update `ARCHITECTURE.md` (new module surface + routes), `MODULE_BOUNDARIES.md` (kanban lives under the `notes` module — it depends on notes/vault, nothing new depends on it), `API_REFERENCE.md`/`openapi.yaml` (new routes), `DESIGN_SYSTEM.md` (board/column/card patterns), and add the threat-model section. CHANGELOG under `[Unreleased]`.

## 21. Implementation phases

1. **Crypto + schema + API + service/repo + validation** (no UI): tables (nullable `note_id` + partial unique), `kanban.ts` crypto incl. **Board Key wrap/unwrap** and scope-aware `unwrapContentKey`, schemas, scope-aware AAD asserts, unified `/api/kanban/*` routes, services, retention, tests (unit/security/services/api). *Server-verifiable, fully testable headless.*
2. **Recogniser + generation (note-bound)**: `kanban-from-note`, `kanban-progress`, generate-from-note preview, create board, note index `hasKanban`. Tests.
3. **Board UI**: board route, columns/cards, add/rename/reorder/delete, **card dialog with due date / priority / labels** + `KanbanLabelManager`, mobile Move menu, debounced save + coalesced snapshots. Tests.
4. **Standalone boards**: `/(vault)/kanban` list + "New board", nav entries, standalone index array, create-with-Board-Key flow. Tests.
5. **Versioning UI + resolve integration**: history panel, restore, semantic diff; all-done suggestion + reopen (note-bound) via existing reflection flow. Tests.
6. **Polish**: smart filters, progress chips, docs, flag flip.

---

## 22. Risks

| Risk | Mitigation |
|------|------------|
| Deterministic recogniser under-recognises prose tasks | Set expectations (checklist/list first); future opt-in on-device LLM |
| Drag-drop version explosion | Debounced save + coalesced snapshots + retention cap |
| Touch drag-and-drop unreliable on mobile | First-class **Move** menu + reorder controls (don't depend on DnD) |
| Single-blob board grows large | Card/size caps; per-card rows possible later |
| Custom columns make "done" ambiguous | Explicit `isDoneColumn` flag + last-done-column guard |
| Re-sync surprises users | Additive-only merge; explicit action; clear summary |
| New encrypted resource weakens guarantees | Exact reuse of note Note-Key/AAD/validation patterns + sentinel/AAD/plaintext tests |
| Standalone Board Key adds a new key path (risk of plaintext key leak / wrong-key decrypt) | Board Key mirrors Note Key handling (generate → wrap under UVK → never persist unwrapped); AAD field `note_kanban_key`@`boardId`; tests assert cross-board keys can't decrypt |
| Card due/labels/priority tempt plaintext columns for sorting/filtering | Keep them **inside the encrypted blob**; sort/filter client-side after decrypt; only derived counts go to the encrypted index |
| Standalone boards have no note → resolve/index assumptions break | Resolve integration gated to note-bound; standalone boards use a separate index array + "100% done" badge only |
