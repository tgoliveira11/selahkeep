# Autosave behavior — SelahKeep

## Scope

Autosave persists **one encrypted local draft per note** (IndexedDB). It does **not** create server-side note versions or version history.

## Triggers

Autosave runs after user activation on:

- Title (including paste)
- Body/content (including paste and checklist toggles in edit preview)
- Tags
- Manual category (blank notes)
- Pending attachments (new note — file selection marks dirty; ciphertext uploaded on explicit save)

**Not triggered:** template selection/prefill alone.

## Timing

- Debounced **1.5s** after the last qualifying change (`useAutosaveTimer`)
- Also flushed before vault auto-lock when dirty (`useNoteVaultBeforeAutoLock`)

## UI states (editor status bar)

| State | Copy |
|-------|------|
| idle | *(no “Saved”)* — shows “Encrypted before save” |
| unsaved | Unsaved changes |
| saving | Saving… |
| saved | Saved *(explicit server save on edit detail only)* |
| draft-saved | Draft saved on this device |
| save-failed | Autosave failed |
| offline | Offline — draft saved on this device |

## Version history

Explicit **Save** on edit persists to the server and may append an encrypted version snapshot (separate feature). Autosave drafts are local-only and overwrite the same draft key — no draft version history.

See `docs/TDR_Note_Version_History.md` for server version snapshots.
