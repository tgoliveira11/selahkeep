"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  MARKDOWN_WRAP_ACTIONS,
  type WrapAction,
} from "@/lib/notes/markdown-actions";

export const EDITOR_TOOLBAR_ACTIONS = [
  "Bold",
  "Italic",
  "H1",
  "H2",
  "Quote",
  "List",
  "Checklist",
  "Link",
  "Code",
] as const;

type ToolbarActionLabel = (typeof EDITOR_TOOLBAR_ACTIONS)[number];

function findWrapAction(label: ToolbarActionLabel): WrapAction {
  const action = MARKDOWN_WRAP_ACTIONS.find((item) => item.label === label);
  if (!action) {
    throw new Error(`Missing markdown action: ${label}`);
  }
  return action;
}

function runVisualAction(editor: Editor, label: ToolbarActionLabel): void {
  const chain = editor.chain().focus();

  switch (label) {
    case "Bold":
      chain.toggleBold().run();
      return;
    case "Italic":
      chain.toggleItalic().run();
      return;
    case "H1":
      chain.toggleHeading({ level: 1 }).run();
      return;
    case "H2":
      chain.toggleHeading({ level: 2 }).run();
      return;
    case "Quote":
      chain.toggleBlockquote().run();
      return;
    case "List":
      chain.toggleBulletList().run();
      return;
    case "Checklist":
      chain.toggleTaskList().run();
      return;
    case "Code":
      chain.toggleCode().run();
      return;
    case "Link": {
      const previous = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt("Link URL", previous ?? "https://");
      if (url === null) return;
      if (url === "") {
        chain.extendMarkRange("link").unsetLink().run();
        return;
      }
      if (!/^https?:\/\//i.test(url)) return;
      chain.extendMarkRange("link").setLink({ href: url }).run();
      return;
    }
    default:
      return;
  }
}

interface EditorToolbarProps {
  mode: "visual" | "markdown";
  editor?: Editor | null;
  onMarkdownAction?: (action: WrapAction) => void;
}

export function EditorToolbar({ mode, editor, onMarkdownAction }: EditorToolbarProps) {
  return (
    <div className="markdown-editor-toolbar flex flex-wrap items-center gap-2">
      {EDITOR_TOOLBAR_ACTIONS.map((label) => (
        <Button
          key={label}
          type="button"
          variant="secondary"
          className="text-xs"
          aria-label={label}
          onClick={() => {
            if (mode === "visual" && editor) {
              runVisualAction(editor, label);
              return;
            }
            onMarkdownAction?.(findWrapAction(label));
          }}
        >
          {label}
        </Button>
      ))}
      <span className="ml-auto hidden text-xs text-[var(--muted)] sm:inline">
        ⌘/Ctrl+S save · B bold · I italic · K link · E code · ⇧8 list · ⇧C checklist
      </span>
    </div>
  );
}
