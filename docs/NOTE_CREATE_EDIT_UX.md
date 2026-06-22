# Note create/edit UX — SelahKeep

## Layout (Stillness design system)

The editor follows the design-system mockup (`docs/design/`). A **top action bar**
holds, left-to-right: a back affordance ("← Notes", which confirms-then-leaves when the
draft is dirty), an autosave **status indicator** ("Draft saved" / "Unsaved changes" /
"Saving…" / "Offline — saved on device" / "Autosave failed"), the focus-mode toggle, and
the primary **Save note** button. There is no duplicate Save at the bottom of the form;
the editor's ⌘/Ctrl+Enter shortcut also submits.

The title is a large **borderless** input at the top of the form (labelled "Title" for
assistive tech via `aria-label`).

## Field order (create and edit)

Both `/notes/new` and note edit mode use the same order, matching the mockup:

1. **Title** — large borderless input
2. **Category** — Blank notes: user-created categories only. Template notes: read-only locked category
3. **Template** (create only) — `/notes/new` template picker; edit infers template category from reserved category names
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
