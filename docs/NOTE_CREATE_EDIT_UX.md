# Note create/edit UX — SelahKeep

## Field order (create and edit)

Both `/notes/new` and note edit mode use the same order:

1. **Template** (create only) — `/notes/new` template picker; edit infers template category from reserved category names
2. **Category** — Blank notes: user-created categories only. Template notes: read-only locked category
3. **Title**
4. **Editor** — Markdown/visual editor with autosave status in the editor header
5. **Attachments** — Encrypted upload/list (create: pending until save; edit: immediate upload)
6. **Tags** — Always last among organizers

Dictation opens from the editor section (review-before-insert flow).

## Template categories

- Non-blank templates show a locked category label; the category is assigned on save
- Blank template restores manual category dropdown (user-created categories only)
- Template prefill does **not** mark the draft dirty or trigger autosave

## Edit mode

- Template-assigned categories are read-only (detected via reserved category names)
- Resolved toggle remains available while editing
- Tags are separated from category (tags last)

See also: `docs/AUTOSAVE_BEHAVIOR.md`, `docs/ENCRYPTED_ATTACHMENTS.md`, `docs/DICTATION_UX.md`.
