"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
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
  onEditorReady?: (editor: Editor | null) => void;
}

function getEditorMarkdown(editor: Editor): string {
  return editor.storage.markdown.getMarkdown();
}

export function VisualNoteEditor({
  value,
  onChange,
  placeholder = "Write what you want to remember…",
  maxLength = 50_000,
  id = "note-visual-editor",
  onSave,
  onEditorReady,
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
        class: "prose-note visual-note-editor-content",
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
      onEditorReady?.(created);
    },
    onDestroy: () => {
      editorRef.current = null;
      onEditorReady?.(null);
    },
    onUpdate: ({ editor: current }) => {
      if (suppressUpdate.current) return;
      const markdown = getEditorMarkdown(current).slice(0, maxLength);
      lastEmitted.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

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
    <div className="note-editor-canvas" data-testid="visual-note-editor-shell">
      <EditorContent editor={editor} />
    </div>
  );
}
