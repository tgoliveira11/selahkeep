import { describe, it, expect } from "vitest";
import {
  applyMarkdownWrap,
  resolveMarkdownShortcut,
  shortcutToWrapAction,
} from "@/lib/notes/markdown-actions";

describe("markdown actions", () => {
  it("wraps selection in bold markers", () => {
    const { next } = applyMarkdownWrap("hello world", { label: "Bold", prefix: "**", suffix: "**" }, 0, 5, 100);
    expect(next).toBe("**hello** world");
  });

  it("inserts checklist prefix", () => {
    const { next } = applyMarkdownWrap(
      "",
      { label: "Checklist", prefix: "- [ ] ", suffix: "", block: true },
      0,
      0,
      100
    );
    expect(next).toBe("- [ ] ");
  });

  it("resolves save shortcut", () => {
    expect(resolveMarkdownShortcut({ key: "s", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBe(
      "save"
    );
  });

  it("resolves checklist shortcut", () => {
    expect(
      resolveMarkdownShortcut({ key: "c", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false })
    ).toBe("checklist");
    expect(shortcutToWrapAction("checklist")?.prefix).toBe("- [ ] ");
  });

  it("resolves inline code shortcut", () => {
    expect(
      resolveMarkdownShortcut({ key: "e", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })
    ).toBe("code");
    expect(shortcutToWrapAction("code")?.prefix).toBe("`");
  });
});
