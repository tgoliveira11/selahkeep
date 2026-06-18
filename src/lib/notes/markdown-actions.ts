export type WrapAction = {
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
};

export const MARKDOWN_WRAP_ACTIONS: WrapAction[] = [
  { label: "Bold", prefix: "**", suffix: "**" },
  { label: "Italic", prefix: "_", suffix: "_" },
  { label: "H1", prefix: "# ", suffix: "", block: true },
  { label: "H2", prefix: "## ", suffix: "", block: true },
  { label: "Quote", prefix: "> ", suffix: "", block: true },
  { label: "List", prefix: "- ", suffix: "", block: true },
  { label: "Checklist", prefix: "- [ ] ", suffix: "", block: true },
  { label: "Link", prefix: "[", suffix: "](https://)" },
  { label: "Code", prefix: "`", suffix: "`" },
];

export function applyMarkdownWrap(
  value: string,
  action: WrapAction,
  selectionStart: number,
  selectionEnd: number,
  maxLength: number
): { next: string; cursor: number } {
  const selected = value.slice(selectionStart, selectionEnd);

  if (action.label === "Checklist" && selected.includes("\n")) {
    const lines = selected.split("\n").map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (/^-\s+\[[ xX]\]/.test(trimmed)) return line;
      return line.replace(/^(\s*)/, "$1- [ ] ");
    });
    const insertion = lines.join("\n");
    const next = (value.slice(0, selectionStart) + insertion + value.slice(selectionEnd)).slice(
      0,
      maxLength
    );
    return { next, cursor: selectionStart + insertion.length };
  }

  const insertion =
    action.block && !selected ? action.prefix : `${action.prefix}${selected}${action.suffix}`;
  const next = (value.slice(0, selectionStart) + insertion + value.slice(selectionEnd)).slice(
    0,
    maxLength
  );
  return { next, cursor: selectionStart + insertion.length };
}

export function isModKey(event: Pick<KeyboardEvent, "metaKey" | "ctrlKey">): boolean {
  return event.metaKey || event.ctrlKey;
}

export type MarkdownShortcutAction =
  | "save"
  | "bold"
  | "italic"
  | "link"
  | "code"
  | "orderedList"
  | "bulletList"
  | "checklist";

export function resolveMarkdownShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">
): MarkdownShortcutAction | null {
  if (!isModKey(event) || event.altKey) return null;

  const key = event.key.toLowerCase();

  if (key === "s" && !event.shiftKey) return "save";
  if (key === "b" && !event.shiftKey) return "bold";
  if (key === "i" && !event.shiftKey) return "italic";
  if (key === "k" && !event.shiftKey) return "link";
  if (key === "e" && !event.shiftKey) return "code";
  if (key === "7" && event.shiftKey) return "orderedList";
  if (key === "8" && event.shiftKey) return "bulletList";
  if (key === "c" && event.shiftKey) return "checklist";

  return null;
}

export function shortcutToWrapAction(action: MarkdownShortcutAction): WrapAction | null {
  switch (action) {
    case "bold":
      return MARKDOWN_WRAP_ACTIONS[0];
    case "italic":
      return MARKDOWN_WRAP_ACTIONS[1];
    case "link":
      return MARKDOWN_WRAP_ACTIONS[7];
    case "code":
      return MARKDOWN_WRAP_ACTIONS[8];
    case "bulletList":
      return MARKDOWN_WRAP_ACTIONS[5];
    case "checklist":
      return MARKDOWN_WRAP_ACTIONS[6];
    case "orderedList":
      return { label: "Ordered list", prefix: "1. ", suffix: "", block: true };
    default:
      return null;
  }
}
