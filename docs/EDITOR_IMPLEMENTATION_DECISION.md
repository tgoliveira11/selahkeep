# Note Editor Implementation Decision

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-06-17 |
| **Product** | SelahKeep |

## Decision

Replace the Markdown-first textarea editor with a **visual (WYSIWYG) editor by default**, using **Tiptap 3** (ProseMirror) with **`tiptap-markdown`** for Markdown import/export. Add a discreet **Markdown expert mode** (`</>` toggle) for power users.

## Options considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Tiptap + tiptap-markdown** | React-native, task lists, toolbar, MD roundtrip, active ecosystem | New dependencies; community MD extension | **Selected** |
| Raw textarea + `marked` preview (previous) | Simple, no editor deps | Not WYSIWYG; users must know Markdown | Replaced as default |
| MDXEditor | Rich MD-focused UX | Heavier bundle; less control over crypto boundary copy | Rejected |
| Custom `contentEditable` | No deps | Fragile paste/a11y/selection; high maintenance | Rejected |

## Canonical storage

- **Markdown remains the encrypted note body format.** No schema change.
- Visual editing is a client-side view; `onChange` always emits Markdown strings.
- HTML is never sent to APIs and is not persisted as the canonical body.
- Save/draft flows are unchanged: parent pages hold plaintext Markdown in React state only until `encryptNote` / `saveEncryptedNoteDraft`.

## Security

- **Encryption boundary unchanged** — only the crypto client encrypts before network I/O.
- **Paste:** rich HTML is sanitized with the same DOMPurify allowlist philosophy as preview (`editor-paste.ts`); scripts, images, and unsafe tags are stripped. Plain-text paste stays plain.
- **Links:** only `http://` and `https://` URLs are accepted in the visual link dialog and Link extension validation.
- **Preview/view mode** still uses `marked` + DOMPurify via `MarkdownPreview` (unchanged).
- **Visual editor document** lives in memory/DOM only while editing; it is not stored in `localStorage` or sent to the server.

## Supported formatting

| Feature | Visual toolbar | Markdown expert | View/preview |
|---------|----------------|-----------------|--------------|
| Bold, italic | ✅ | ✅ | ✅ |
| H1, H2 | ✅ | ✅ | ✅ (H3+ render if present in legacy notes) |
| Blockquote | ✅ | ✅ | ✅ |
| Bullet list | ✅ | ✅ | ✅ |
| Task list (`- [ ]` / `- [x]`) | ✅ | ✅ | ✅ interactive in view/edit preview |
| Link (`https` only) | ✅ | ✅ | ✅ |
| Inline code | ✅ | ✅ | ✅ |
| Fenced code blocks | ❌ (expert MD only) | ✅ source | ✅ render |

## Limitations & conversion warnings

Switching from Markdown expert → Visual shows a **non-blocking warning** when the source contains features the visual serializer may simplify:

- Headings below H2 (`###`+)
- Images
- Tables
- Raw HTML (outside code)
- Fenced code blocks
- Strikethrough

Users can still switch; unsupported constructs may flatten or drop on the next visual edit cycle.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+S | Save (when `onSave` provided) |
| ⌘/Ctrl+B | Bold |
| ⌘/Ctrl+I | Italic |
| ⌘/Ctrl+K | Link |
| ⌘/Ctrl+E | Inline code (Markdown mode; Tiptap default in visual) |
| ⌘/Ctrl+Shift+8 | Bullet list |
| ⌘/Ctrl+Shift+C | Checklist |

Tag chip input shortcuts (Space, Tab, etc.) are unaffected — separate control.

## Dependencies added

```json
"@tiptap/react", "@tiptap/starter-kit", "@tiptap/extension-link",
"@tiptap/extension-task-list", "@tiptap/extension-task-item",
"@tiptap/extension-placeholder", "tiptap-markdown"
```

Existing `marked` + `isomorphic-dompurify` remain for read-only preview and sanitization.

## Key files

| Path | Role |
|------|------|
| `src/features/notes/markdown-editor.tsx` | Mode toggle + orchestration |
| `src/features/notes/visual-note-editor.tsx` | Tiptap visual editor |
| `src/features/notes/markdown-expert-editor.tsx` | Textarea + preview |
| `src/components/notes/editor-toolbar.tsx` | Shared toolbar |
| `src/features/notes/note-editor-extensions.ts` | Tiptap extension factory |
| `src/lib/notes/markdown-roundtrip.ts` | Conversion warnings |
| `src/lib/notes/editor-paste.ts` | Paste HTML sanitization |

## Accessibility & mobile

- Visual editor uses `role="textbox"` and `aria-label="Note body"`.
- Toolbar buttons have `aria-label` and `min-h-11` touch targets (via `globals.css`).
- Focus ring on editor content area.

## Voice input into the editor

`/notes/new` can populate the editor body by **dictation**. The transcript is produced **on-device** (Whisper via transformers.js) and inserted as plain Markdown text through the normal editor `onChange`; the editor and canonical Markdown storage are unchanged. No audio or transcript leaves the browser. See [`TDR_Local_Voice_Notes.md`](./TDR_Local_Voice_Notes.md).

## Testing

- Unit: roundtrip warnings, paste sanitization, markdown actions (incl. code shortcut)
- Features: `markdown-editor.test.tsx`, `visual-note-editor.test.tsx`, updated `notes-ux.test.tsx`
- Security: existing `markdown-sanitization.test.ts`, `notes-plaintext-rejection.test.ts` unchanged
