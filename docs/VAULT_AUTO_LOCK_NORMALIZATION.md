# Vault Auto-Lock Normalization

SelahKeep auto-locks the vault after a configurable period of inactivity. This document describes the normalized implementation introduced to fix incorrect locked-state copy, missed editor activity, and draft loss on auto-lock.

## Configuration

| Source | Variable | Default |
|--------|----------|---------|
| Client / build | `NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES` | 15 |
| Server-only fallback | `VAULT_AUTO_LOCK_MINUTES` | 15 |

Implementation: `src/lib/vault/vault-auto-lock-config.ts`

- `getVaultAutoLockTimeoutMs()` — single source of truth for timeout duration
- `VAULT_INACTIVITY_MS` — module-load constant re-exported for tests

Invalid or out-of-range values (below 1 minute or above 24 hours) fall back to 15 minutes.

## Session timer

`src/lib/crypto-client/vault-session.ts` owns the **single** inactivity `setTimeout`:

- `scheduleVaultAutoLock()` / `touchVaultSession()` — reset timer on activity
- `registerVaultBeforeAutoLock(handler)` — async hooks run **before** inactivity lock (draft save)
- `configureVaultAutoLock(callback)` — runs **after** inactivity lock (banner, security event)
- `wasVaultLockedByInactivity()` — distinguishes auto-lock from manual lock for UI copy
- `lockVaultSessionManually()` — manual lock from dock; does not set inactivity flag

Manual sign-out and tab unload call `lockVaultSession()` directly.

## Activity detection

`src/features/vault/use-vault-activity.ts` (mounted in `src/app/(vault)/layout.tsx`):

- Window: `click`, `focusin`, `scroll`, `touchstart`
- Document capture: `keydown`, `input`, `pointerdown`, `compositionstart`, `compositionend`, `paste`
- `touchVaultActivity()` — explicit export for TipTap/editor paths that may not bubble

Wired in `MarkdownEditor` (`onChange`, toolbar, mode toggle) and note page form handlers (title, categories, tags, templates, checklist, resolved toggle).

## Locked-state UI

`src/features/vault/vault-locked-state.tsx` — context-specific copy and actions:

| Variant | Heading (initial) | Auto-lock heading |
|---------|-------------------|-------------------|
| `notes-list` | Your vault is closed | — |
| `write` | Unlock to write | Vault closed while writing |
| `read-note` | Unlock to read this note | — |
| `vault-settings` | Unlock your vault to manage vault settings | — |
| `vault-security` | Unlock your vault to run security checks | — |

Actions (all variants):

1. **Unlock here** — `requestVaultDockExpand()` (vault password via dock)
2. **Open full unlock page** — `buildVaultUnlockHref(returnTo)`

No recovery protection summary. No “recovery code” in active copy (recovery phrase only on full unlock page).

`NotesVaultProtectedMessage` delegates to `notes-list` variant.

`/notes/new` uses `write` variant (replaces `VaultAccessGate`).

## Draft safety on auto-lock

`src/features/notes/use-note-vault-before-auto-lock.ts` registers `persistDraft` when the note form is dirty.

Used on `/notes/new` and `/notes/[id]` (edit mode). Encrypted drafts are saved in IndexedDB before the vault key is cleared.

## Auto-lock notice

`VaultAutoLockNotice` shows a calm banner after inactivity lock. On writing routes (`/notes/new`, `/notes/[id]`), the message notes that unsaved work may be saved as an encrypted draft.

## Tests

| File | Coverage |
|------|----------|
| `src/test/unit/vault-auto-lock-config.test.ts` | Env config |
| `src/test/unit/vault-session.test.ts` | Timer, beforeAutoLock, inactivity flag |
| `src/test/features/vault-activity.test.tsx` | Events + `touchVaultActivity` |
| `src/test/features/vault-auto-lock-normalization.test.tsx` | Locked-state variants and copy |
| `src/test/features/notes-vault-locked-state.test.tsx` | Dock expand from notes list |
| `src/test/security/vault-auto-lock-draft.test.ts` | No plaintext leakage on lock path |

## Related files

- `src/features/vault/vault-auto-lock-notice.tsx`
- `src/features/vault/use-vault-auto-lock-countdown.ts`
- `src/features/vault/vault-status-dock.tsx` — manual lock via `lockVaultSessionManually`
