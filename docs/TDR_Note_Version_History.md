# TDR — Encrypted Note Version History

> Product: **SelahKeep** (former working name: LTG Vault). This TDR designs **Feature 1 — full note history and versioning** with GitHub-style comparison, fully encrypted and consistent with the existing vault model.

## 1. Status

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-06-21 |
| **Decision type** | Product / Architecture / Security |
| **Related** | [`docs/TDR_LTG_Vault_MVP.md`](./TDR_LTG_Vault_MVP.md), [`docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`](./ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md), [`SECURITY.md`](../SECURITY.md) |
| **Supersedes** | Promotes "Note version history" from *Future phases (not MVP)* in the MVP TDR (§2, §21 row 6) to an implemented feature |

---

## 2. Executive Summary

Today a SelahKeep note stores exactly one encrypted state: `notes.encrypted_metadata`, `notes.encrypted_body`, `notes.encrypted_wrapped_note_key`. Editing a note overwrites the previous state in place (`PUT /api/notes/:id`); the only history is the **lifecycle event timeline** (`created`, `updated`, `resolved`, …) stored inside encrypted metadata, which records *that* a change happened but not *what the content was*.

This feature adds **immutable, append-only encrypted version snapshots** of a note's editable content. The user can:

- See a chronological list of previous versions of a note (after vault unlock).
- Open any previous version read-only.
- **Compare** any two versions in a **GitHub-style line diff** (additions / deletions).
- **Restore** a previous version (restore creates a new version — never destroys history, exactly like a `git revert`).

The feature must preserve every existing guarantee:

- **No plaintext** title/body/metadata ever reaches an API or the database.
- Versions are encrypted **client-side** before transport, under the note's own **Note Key**, which is wrapped by the **User Vault Key (UVK)**.
- Version content is only readable while the vault is unlocked.
- The server stores **encrypted blobs only** and validates AAD binding.

---

## 3. Goals and Non-Goals

### 3.1 Goals

1. Capture an encrypted snapshot of a note's editable content on every meaningful content save.
2. Let the user browse, read, diff, and restore previous versions after unlock.
3. Keep the same cryptographic posture as ADR-005 (per-note key, AES-256-GCM, AAD binding, Argon2id-derived UVK envelopes).
4. Bound storage growth with a configurable retention limit.
5. Add no new plaintext API surface; reuse the existing plaintext-rejection and AAD-validation policies.

### 3.2 Non-Goals

- Versioning of **lifecycle-only** changes (pin, favorite, archive, trash, resolve). Those remain captured by the existing encrypted lifecycle timeline; they do **not** create content snapshots.
- Real-time collaborative editing / operational transforms.
- Cross-note or cross-device merge.
- Server-side diffing or server-side decryption of any kind.
- Versioning of encrypted local drafts (IndexedDB drafts are unchanged).

---

## 4. What is a "version"

A **version** is an immutable snapshot of a note's **editable content** at the moment it was saved:

```text
title, body (Markdown), categoryId, tagIds, answered, createdAt, updatedAt, resolvedReflection, lifecycleEvents
```

(That is the full `NoteMetadataPlaintext` minus nothing — we snapshot the whole metadata object plus the Markdown body, so a restored version is faithful.)

Semantics, mirroring git:

| Event | Effect on versions |
|-------|--------------------|
| Note created | Version **1** is written with the initial content |
| Content saved (editor "Save", checklist toggle) | A new version **N+1** is appended |
| Pin / favorite / archive / trash / restore / resolve toggles | **No** new version (lifecycle timeline only) |
| Restore version K | Note content is set to version K and saved → appends a **new** version N+1 (history is never rewritten) |
| Permanent delete of note | Versions cascade-delete with the note (FK `ON DELETE CASCADE`) |

The **current note row is always equal to the latest version**. The version list is therefore "every committed content state, newest first."

To avoid noise, the client only appends a version when the editable content actually changed (it already computes a `dirty` snapshot in the editor). Identical consecutive saves do not create duplicate versions.

---

## 5. Cryptography (extends ADR-005)

### 5.1 Key reuse

A note already owns a **Note Key** (AES-256-GCM, 256-bit), wrapped by the UVK and stored in `notes.encrypted_wrapped_note_key` with AAD `{ userId, resourceId: noteId, field: "note_key" }`.

**A version reuses the note's existing Note Key.** No new key material is generated per version. The version row stores a copy of the same wrapped-note-key payload so the version is self-contained and decryptable as long as the UVK can unwrap it.

### 5.2 Per-version AAD binding (decision: client-encrypted, per-version AAD)

Each version's content is encrypted **on the client** under the Note Key with AAD bound to a **unique, client-generated `versionId` (UUID)**, using two new AAD `field` values:

| Payload | AAD `field` | AAD `resourceId` |
|---------|-------------|------------------|
| Version metadata snapshot | `note_version_metadata` | `versionId` |
| Version body snapshot | `note_version_body` | `versionId` |
| Wrapped note key (copy) | `note_key` | `noteId` |

Binding content payloads to `versionId` (not `noteId`) prevents a malicious or buggy server from swapping one version's ciphertext for another version of the same note. The wrapped-key payload stays bound to `noteId` because the key belongs to the note, and the server cross-checks that the version's `note_id` row matches.

This is strictly stronger than copying the live note's encrypted blobs server-side (which would leave all versions sharing `resourceId: noteId` and allow undetectable reordering). It is consistent with the ADR-005 principle that every encrypted payload is AAD-bound to the narrowest resource it represents.

### 5.3 Encrypted payload format

Unchanged `enc-v1` envelope (AES-256-GCM, 12-byte random IV, canonical-JSON AAD). Only the AAD `field` enum gains `note_version_metadata` and `note_version_body`.

### 5.4 Decryption path

```text
UVK (session) ──unwrap──▶ Note Key ──decrypt──▶ version metadata (verify AAD versionId)
                                   └──decrypt──▶ version body     (verify AAD versionId)
```

The client verifies AAD with `verifyPayloadAad` before trusting any decrypted bytes, exactly as `decryptNote` does today.

---

## 6. Data model

### 6.1 New table `note_versions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | **client-generated** `versionId` (also the AAD `resourceId` of the snapshot payloads) |
| `note_id` | uuid FK → `notes.id` `ON DELETE CASCADE` | owning note |
| `vault_id` | uuid FK → `user_vaults.id` `ON DELETE CASCADE` | scoping for authorization queries |
| `version_number` | integer NOT NULL | server-assigned, monotonically increasing per note, starting at 1 |
| `encrypted_metadata` | jsonb NOT NULL | `enc-v1` payload, AAD `note_version_metadata` / `versionId` |
| `encrypted_body` | jsonb NOT NULL | `enc-v1` payload, AAD `note_version_body` / `versionId` |
| `encrypted_wrapped_note_key` | jsonb NOT NULL | copy of the note's wrapped key, AAD `note_key` / `noteId` |
| `body_encryption_version` | text NOT NULL | `enc-v1` |
| `created_at` | timestamptz NOT NULL default now() | when the snapshot was taken |

Indexes:

- `idx_note_versions_note_id_version` on `(note_id, version_number DESC)` — list newest first.
- `idx_note_versions_note_id_created_at` on `(note_id, created_at DESC)`.

No plaintext columns. The `schema-no-plaintext` guard test is extended to assert the same forbidden columns are absent here.

### 6.2 No change to `notes` or the vault index

Versions are fetched per-note on demand. The encrypted vault index is **not** modified (no version data leaks into the list cache), keeping the blast radius minimal.

---

## 7. Retention (decision: keep last N, configurable)

Unbounded history would grow storage without limit for heavily-edited notes. Policy:

- Per-note cap `NOTE_VERSION_HISTORY_LIMIT`, default **50**, read server-side from env (`src/lib/config/note-version-policy.ts`).
- On version create, inside the same DB transaction, the server prunes the **oldest** versions (lowest `version_number`) beyond the cap. Pruning operates purely on row counts and timestamps — **no plaintext, no keys** are involved.
- The latest version is never pruned.
- The cap and pruning behavior are documented in `README.md` and `SECURITY.md`. The UI notes that "older versions beyond the most recent N are removed automatically."

---

## 8. API design (encrypted payloads only)

All routes are authenticated (`requireSessionUser`), scoped to the caller's vault, and pass through `assertNoPlaintextNoteFields` + AAD validation.

| Method | Route | Purpose | Body |
|--------|-------|---------|------|
| `POST` | `/api/notes/:id/versions` | Append an encrypted version snapshot | `{ id: versionId, encryptedMetadata, encryptedBody, encryptedWrappedNoteKey, bodyEncryptionVersion }` |
| `GET` | `/api/notes/:id/versions` | List version rows (encrypted; newest first) | — |
| `GET` | `/api/notes/:id/versions/:versionId` | Fetch one version's full encrypted payload | — |

- `POST` validates: payload sizes, `bodyEncryptionVersion === enc-v1`, AAD (`assertNoteVersionAad`), and that the parent note exists in the caller's vault. Server assigns `version_number`, inserts, prunes beyond cap — all in one transaction.
- `GET` list returns rows **including** `encrypted_metadata` so the client can decrypt titles/timestamps for the history list; it never returns plaintext.
- No `PUT`/`DELETE` on individual versions (versions are immutable; they die only with the note or via retention pruning).

### 8.1 No-plaintext contract additions

`rejectPlaintextNoteFields` already forbids `title`, `body`, `metadata`, `tags`, etc. The version routes reuse it unchanged. New AAD validator: `assertNoteVersionAad(userId, noteId, versionId, input)`.

---

## 9. Client architecture

```text
Note editor (new/[id] pages)
  └─ useNotes.createNote / updateNote
        └─ encryptNoteVersion()  (src/lib/crypto-client/note-versions.ts)
        └─ noteVersionsApi.create()  (src/lib/api-client/note-versions.ts)

Version history UI (note detail)
  └─ useNoteVersions()  (src/features/notes/use-note-versions.ts)
        └─ noteVersionsApi.list/get → decryptNoteVersion()
        └─ diffNoteVersions() via src/lib/notes/text-diff.ts (pure LCS line diff)
  └─ NoteVersionHistory + NoteVersionDiff components
```

- **Capture point:** `createNote` (version 1) and `updateNote` (subsequent versions) in `src/features/notes/use-notes.ts`. Lifecycle toggles are untouched. Version creation is best-effort and **must not** fail the primary save — a version-write failure is logged to the editor status and the note save still succeeds (history is additive, not transactional with the note body).
- **Diff:** a dependency-free Myers/LCS line diff in `src/lib/notes/text-diff.ts` (pure, fully unit-tested), rendered GitHub-style (green added / red removed, line numbers). Works on decrypted Markdown in-memory only.
- **Restore:** decrypt the chosen version client-side, populate the editor with its content, and save through the normal `updateNote` path (which appends a new version). The user confirms via a dialog. No special server route.

---

## 10. Security requirements

1. Version title/body/metadata are **never** sent to or stored by the server in plaintext (guarded by `assertNoPlaintextNoteFields`, `rejectPlaintextNoteFields`, sentinel tests extended to versions).
2. Every version content payload is AAD-bound to its `versionId`; the wrapped key to `noteId`. Server rejects mismatches (`assertNoteVersionAad`).
3. Versions are decryptable only with the UVK in the active vault session; locking the vault clears the ability to read them.
4. No version data enters logs, audit events, the vault index, or admin endpoints.
5. Retention pruning never inspects plaintext.
6. Diffing happens entirely client-side on already-decrypted content.
7. Account deletion / note permanent-delete cascade-removes versions (FK cascade) — verified by the account-deletion-cascade test.

---

## 11. Testing

| Layer | Coverage |
|-------|----------|
| Unit (crypto) | `encryptNoteVersion`/`decryptNoteVersion` round-trip; AAD binding to `versionId`; tamper/wrong-AAD rejection; locked-vault failure |
| Unit (diff) | `text-diff.ts` line diff: additions, deletions, unchanged, empty, identical, multi-hunk |
| Validation | `createNoteVersionSchema` accept/reject; plaintext rejection |
| Security | sentinel phrase never present in version payloads/responses/logs; schema has no plaintext columns; AAD validation rejects cross-version/cross-note swaps |
| Services | `noteVersionService` create (version numbering, prune beyond cap, vault scoping, AAD), list, getById, not-found |
| API routes | `POST/GET` versions handlers with mocked auth + service; plaintext rejection; 404s |

Coverage thresholds (≥90% lines/statements/functions on enforced scope) must not regress. New code under `src/lib/crypto-client`, `src/lib/validation`, `src/lib/api-client`, `src/app/api`, and `src/modules/notes/services` is in the enforced scope and is fully tested.

---

## 12. Documentation impact

- `README.md` — Notes section gains "Version history & compare"; env var `NOTE_VERSION_HISTORY_LIMIT`; migration `0012` note.
- `ARCHITECTURE.md` — new table, routes, envelope/AAD fields.
- `SECURITY.md` — version encryption model, AAD binding, retention.
- `ADR-005` — note about `note_version_metadata` / `note_version_body` AAD fields and per-version binding.
- `docs/README.md` — index entry for this TDR.
- `CHANGELOG.md` — `Added` + `Security` entries.

---

## 13. Rollout / migration

- Forward-only migration `0012_note_versions.sql` (additive table; safe on existing data).
- Existing notes have no versions until next save; the history panel shows "No previous versions yet" until then. This is acceptable and documented (we do not back-fill, since we have no prior plaintext snapshots to encrypt).

---

## 14. Resolved decisions

| # | Decision |
|---|----------|
| 1 | Versions are **client-encrypted** under the note's existing Note Key |
| 2 | Content payloads are AAD-bound to a unique **`versionId`**; wrapped key bound to `noteId` |
| 3 | New table `note_versions` (append-only, immutable rows) |
| 4 | Retention: keep last **N** per note (default 50, env-configurable), prune oldest server-side |
| 5 | Version captured on content save (create + editor/checklist update); **not** on lifecycle toggles |
| 6 | Restore = load + save (appends a new version); history is never rewritten |
| 7 | Diff is a dependency-free client-side line diff, GitHub-style |
| 8 | No vault-index change; versions fetched per note on demand |
