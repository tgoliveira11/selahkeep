# Note Editor UI/UX Redesign Decision

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-06-17 |
| **Product** | SelahKeep |

## Problem

The first visual editor pass (Tiptap) worked functionally but still felt like a technical tool:

- disconnected toolbar row of text buttons;
- visible mode switch competing with formatting controls;
- raw textarea aesthetic bleeding into visual mode;
- no cohesive writing card or subtle save/draft status;
- template picker looked like a generic form control.

## Decision

**Keep Tiptap 3 + `tiptap-markdown`** as the editor engine and redesign the **presentation layer** only:

- unified `note-editor-card` container (toolbar + canvas + status);
- compact icon-first grouped toolbar with sticky header;
- discreet Markdown toggle at toolbar edge;
- collapsible preview in Markdown mode (`<details>`);
- chip-style template picker;
- accessible link popover (replaces `window.prompt`);
- subtle `EditorStatusBar` for unsaved/saving/draft states.

No new editor dependency was added in this pass.

## Canonical storage (unchanged)

- Markdown remains the encrypted note body format.
- Visual editing is client-side only; `onChange` emits Markdown.
- HTML is never sent to APIs or persisted as canonical body.

## Security (unchanged)

- Encryption boundary unchanged.
- Paste sanitization via `editor-paste.ts`.
- Links restricted to `http://` / `https://` in popover and Tiptap Link extension.
- View/preview still uses `marked` + DOMPurify.

## Limitations

- Visual mode does not edit fenced code blocks, images, tables, H3+, or strikethrough — use Markdown mode.
- Active toolbar states apply in visual mode only.
- Link popover is intentionally simple (no link title editing).

## Follow-ups

- Floating toolbar on text selection.
- Optional relative timestamps in status bar (“Draft saved 2 min ago”).
- Persist editor mode preference in encrypted vault settings.
