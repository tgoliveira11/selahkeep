"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/ui/cn";
import {
  MARKDOWN_WRAP_ACTIONS,
  type WrapAction,
} from "@/lib/notes/markdown-actions";
import { EditorLinkPopover } from "@/components/notes/editor-link-popover";
import {
  IconBold,
  IconChecklist,
  IconCode,
  IconH1,
  IconH2,
  IconItalic,
  IconLink,
  IconList,
  IconMarkdown,
  IconQuote,
} from "@/components/notes/editor-toolbar-icons";
import { EditorQuickInsert } from "@/components/notes/editor-quick-insert";
import {
  getQuickInsertSnippet,
  type QuickInsertId,
} from "@/lib/notes/quick-insert-snippets";
import type { NoteEditorMode } from "@/features/notes/markdown-editor";

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

const ACTION_ICONS: Record<ToolbarActionLabel, React.ComponentType<{ className?: string }>> = {
  Bold: IconBold,
  Italic: IconItalic,
  H1: IconH1,
  H2: IconH2,
  Quote: IconQuote,
  List: IconList,
  Checklist: IconChecklist,
  Link: IconLink,
  Code: IconCode,
};

const HEADING_ACTIONS: ToolbarActionLabel[] = ["H1", "H2"];
const FORMAT_ACTIONS: ToolbarActionLabel[] = ["Bold", "Italic", "Code"];
const BLOCK_ACTIONS: ToolbarActionLabel[] = ["Quote", "List", "Checklist"];
const INSERT_ACTIONS: ToolbarActionLabel[] = ["Link"];

function findWrapAction(label: ToolbarActionLabel): WrapAction {
  const action = MARKDOWN_WRAP_ACTIONS.find((item) => item.label === label);
  if (!action) {
    throw new Error(`Missing markdown action: ${label}`);
  }
  return action;
}

function isVisualActive(editor: Editor, label: ToolbarActionLabel): boolean {
  switch (label) {
    case "Bold":
      return editor.isActive("bold");
    case "Italic":
      return editor.isActive("italic");
    case "H1":
      return editor.isActive("heading", { level: 1 });
    case "H2":
      return editor.isActive("heading", { level: 2 });
    case "Quote":
      return editor.isActive("blockquote");
    case "List":
      return editor.isActive("bulletList");
    case "Checklist":
      return editor.isActive("taskList");
    case "Code":
      return editor.isActive("code");
    case "Link":
      return editor.isActive("link");
    default:
      return false;
  }
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
    default:
      return;
  }
}

interface ToolbarButtonProps {
  label: ToolbarActionLabel;
  active?: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, active, onClick }: ToolbarButtonProps) {
  const Icon = ACTION_ICONS[label];
  return (
    <button
      type="button"
      className={cn("note-editor-toolbar__btn", active && "note-editor-toolbar__btn--active")}
      aria-label={label}
      title={label}
      onClick={onClick}
      data-testid={`toolbar-${label.toLowerCase()}`}
    >
      <Icon />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function ToolbarDivider() {
  return <div className="note-editor-toolbar__divider" aria-hidden="true" />;
}

interface EditorToolbarProps {
  mode: NoteEditorMode;
  editor?: Editor | null;
  onMarkdownAction?: (action: WrapAction) => void;
  onQuickInsert?: (id: QuickInsertId) => void;
  onModeToggle?: () => void;
}

export function EditorToolbar({
  mode,
  editor,
  onMarkdownAction,
  onQuickInsert,
  onModeToggle,
}: EditorToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);

  function handleAction(label: ToolbarActionLabel) {
    if (label === "Link") {
      if (mode === "visual" && editor) {
        setLinkOpen(true);
        return;
      }
      onMarkdownAction?.(findWrapAction(label));
      return;
    }

    if (mode === "visual" && editor) {
      runVisualAction(editor, label);
      return;
    }
    onMarkdownAction?.(findWrapAction(label));
  }

  function renderGroup(actions: ToolbarActionLabel[]) {
    return actions.map((label) => (
      <ToolbarButton
        key={label}
        label={label}
        active={mode === "visual" && editor ? isVisualActive(editor, label) : false}
        onClick={() => handleAction(label)}
      />
    ));
  }

  return (
    <div className="note-editor-toolbar" data-testid="note-editor-toolbar">
      <div className="note-editor-toolbar__scroll">
        <div className="note-editor-toolbar__group" role="group" aria-label="Headings">
          {renderGroup(HEADING_ACTIONS)}
        </div>
        <ToolbarDivider />
        <div className="note-editor-toolbar__group" role="group" aria-label="Text formatting">
          {renderGroup(FORMAT_ACTIONS)}
        </div>
        <ToolbarDivider />
        <div className="note-editor-toolbar__group" role="group" aria-label="Blocks">
          {renderGroup(BLOCK_ACTIONS)}
        </div>
        <ToolbarDivider />
        <div className="note-editor-toolbar__group" role="group" aria-label="Insert">
          <EditorQuickInsert
            onSelect={(id) => {
              if (onQuickInsert) {
                onQuickInsert(id);
                return;
              }
              if (mode === "markdown" && onMarkdownAction) {
                const snippet = getQuickInsertSnippet(id);
                onMarkdownAction({
                  label: "Quick insert",
                  prefix: snippet,
                  suffix: "",
                  block: true,
                });
              }
            }}
          />
          {renderGroup(INSERT_ACTIONS)}
        </div>
        {linkOpen && mode === "visual" && editor ? (
          <EditorLinkPopover
            initialUrl={(editor.getAttributes("link").href as string | undefined) ?? ""}
            onApply={(url) => {
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }}
            onRemove={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            }}
            onClose={() => setLinkOpen(false)}
          />
        ) : null}
      </div>
      {onModeToggle ? (
        <div className="note-editor-toolbar__mode">
          <button
            type="button"
            className={cn(
              "note-editor-toolbar__mode-btn",
              mode === "markdown" && "note-editor-toolbar__mode-btn--active"
            )}
            aria-label={mode === "visual" ? "Switch to Markdown source" : "Switch to visual editor"}
            aria-pressed={mode === "markdown"}
            title={mode === "visual" ? "Markdown source" : "Visual editor"}
            data-testid="editor-mode-markdown"
            onClick={onModeToggle}
          >
            <IconMarkdown />
            <span className="note-editor-toolbar__mode-label">
              {mode === "visual" ? "Markdown" : "Visual"}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
