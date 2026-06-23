import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";

/**
 * Line-break keymap: Enter inserts a simple line break (a `<br>`, one line down),
 * while Shift+Enter starts a new paragraph (a blank-line gap). This is the
 * inverse of ProseMirror's defaults, matching the product's writing model.
 * Lists and code blocks keep their native Enter behaviour (new item / newline).
 */
const LineBreakKeymap = Extension.create({
  name: "lineBreakKeymap",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from } = this.editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          const name = $from.node(depth).type.name;
          if (name === "listItem" || name === "taskItem" || name === "codeBlock") {
            return false;
          }
        }
        return this.editor.commands.setHardBreak();
      },
      "Shift-Enter": () => this.editor.commands.splitBlock(),
    };
  },
});

export function createNoteEditorExtensions(placeholder?: string) {
  return [
    LineBreakKeymap,
    StarterKit.configure({
      heading: { levels: [1, 2] },
      strike: false,
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: true,
      defaultProtocol: "https",
      validate: (href) => /^https?:\/\//i.test(href),
    }),
    TaskList,
    TaskItem.configure({ nested: false }),
    Placeholder.configure({
      placeholder: placeholder ?? "Write your note…",
    }),
    Markdown.configure({
      html: false,
      tightLists: true,
      bulletListMarker: "-",
      breaks: true,
      transformPastedText: false,
      transformCopiedText: false,
    }),
  ];
}
