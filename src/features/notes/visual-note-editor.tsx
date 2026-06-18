"use client";

import { useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { EditorToolbar } from "@/components/notes/editor-toolbar";
import { sanitizeEditorPasteHtml } from "@/lib/notes/editor-paste";
import { isModKey } from "@/lib/notes/markdown-actions";
import { createNoteEditorExtensions } from "@/features/notes/note-editor-extensions";

interface VisualNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
  onSave?: () => void;
}

function getEditorMarkdown(editor: Editor): string {
  return editor.storage.markdown.getMarkdown();
}

export function VisualNoteEditor({
  value,
  onChange,
  placeholder = "Write your note…",
  maxLength = 50_000,
  id = "note-visual-editor",
  onSave,
}: VisualNoteEditorProps) {
  const suppressUpdate = useRef(false);
  const lastEmitted = useRef(value);
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createNoteEditorExtensions(placeholder),
    content: value,
    editorProps: {
      attributes: {
        id,
        class:
          "prose-note visual-note-editor-content min-h-[12rem] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        "aria-label": "Note body",
        role: "textbox",
        "data-testid": "visual-note-editor",
      },
      handleKeyDown: (_view, event) => {
        if (isModKey(event) && event.key.toLowerCase() === "s" && !event.shiftKey) {
          if (onSave) {
            event.preventDefault();
            onSave();
          }
          return true;
        }

        if (isModKey(event) && event.shiftKey && event.key.toLowerCase() === "c") {
          event.preventDefault();
          editorRef.current?.chain().focus().toggleTaskList().run();
          return true;
        }

        return false;
      },
      transformPastedHTML: (html) => sanitizeEditorPasteHtml(html),
    },
    onCreate: ({ editor: created }) => {
      editorRef.current = created;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    onUpdate: ({ editor: current }) => {
      if (suppressUpdate.current) return;
      const markdown = getEditorMarkdown(current).slice(0, maxLength);
      lastEmitted.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;

    const current = getEditorMarkdown(editor);
    if (current === value) {
      lastEmitted.current = value;
      return;
    }

    suppressUpdate.current = true;
    editor.commands.setContent(value);
    suppressUpdate.current = false;
    lastEmitted.current = value;
  }, [editor, value]);

  return (
    <div className="space-y-4" data-testid="visual-note-editor-shell">
      <EditorToolbar mode="visual" editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
