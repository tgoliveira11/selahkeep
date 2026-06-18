import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";

export function createNoteEditorExtensions(placeholder?: string) {
  return [
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
