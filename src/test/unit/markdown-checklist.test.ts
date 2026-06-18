import { describe, it, expect } from "vitest";
import { countChecklistItems, toggleChecklistAtIndex } from "@/lib/notes/markdown-checklist";

describe("markdown checklist", () => {
  it("counts checklist items", () => {
    const markdown = "- [ ] one\n- [x] two\n* [ ] three";
    expect(countChecklistItems(markdown)).toBe(3);
  });

  it("toggles unchecked to checked", () => {
    const markdown = "- [ ] Pray\n- [ ] Rest";
    expect(toggleChecklistAtIndex(markdown, 0)).toBe("- [x] Pray\n- [ ] Rest");
  });

  it("toggles checked to unchecked", () => {
    const markdown = "- [X] Done";
    expect(toggleChecklistAtIndex(markdown, 0)).toBe("- [ ] Done");
  });

  it("toggles the correct item by index", () => {
    const markdown = "- [ ] first\n- [x] second";
    expect(toggleChecklistAtIndex(markdown, 1)).toBe("- [ ] first\n- [ ] second");
  });
});
