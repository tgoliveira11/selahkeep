export type NoteViewMode = "cards" | "list";

export const NOTE_VIEW_MODE_STORAGE_KEY = "selahkeep:notes:view-mode";

export const DEFAULT_NOTE_VIEW_MODE: NoteViewMode = "cards";

export function readNoteViewMode(): NoteViewMode {
  if (typeof window === "undefined") return DEFAULT_NOTE_VIEW_MODE;
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") return DEFAULT_NOTE_VIEW_MODE;
    const stored = storage.getItem(NOTE_VIEW_MODE_STORAGE_KEY);
    return stored === "list" ? "list" : DEFAULT_NOTE_VIEW_MODE;
  } catch {
    return DEFAULT_NOTE_VIEW_MODE;
  }
}

export function writeNoteViewMode(mode: NoteViewMode): void {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") return;
    storage.setItem(NOTE_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Non-sensitive preference — ignore storage failures.
  }
}
