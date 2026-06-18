import { describe, it, expect, vi } from "vitest";
import {
  readNoteViewMode,
  writeNoteViewMode,
  NOTE_VIEW_MODE_STORAGE_KEY,
  DEFAULT_NOTE_VIEW_MODE,
} from "@/lib/notes/note-view-mode";

describe("note view mode preference", () => {
  it("defaults to cards", () => {
    expect(DEFAULT_NOTE_VIEW_MODE).toBe("cards");
    expect(readNoteViewMode()).toBe("cards");
  });

  it("persists list mode in localStorage", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });

    writeNoteViewMode("list");
    expect(storage.get(NOTE_VIEW_MODE_STORAGE_KEY)).toBe("list");
    expect(readNoteViewMode()).toBe("list");

    vi.unstubAllGlobals();
  });
});
