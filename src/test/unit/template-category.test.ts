import { describe, it, expect, vi } from "vitest";
import {
  getTemplateCategoryName,
  isTemplateWithLockedCategory,
  resolveTemplateCategoryId,
} from "@/lib/notes/template-category";
import { REQUIRED_TEMPLATE_IDS } from "@/lib/notes/note-templates";

describe("template category", () => {
  it("blank note has no template category", () => {
    expect(isTemplateWithLockedCategory("blank")).toBe(false);
    expect(getTemplateCategoryName("blank")).toBeNull();
  });

  it("assigns matching category names for required templates", () => {
    expect(getTemplateCategoryName("prayer")).toBe("Prayer");
    expect(getTemplateCategoryName("reflection")).toBe("Reflection");
    expect(getTemplateCategoryName("gratitude")).toBe("Gratitude");
    expect(getTemplateCategoryName("sermon-notes")).toBe("Sermon Notes");
    expect(getTemplateCategoryName("anxiety-dump")).toBe("Anxiety Dump");
  });

  it("every non-blank template has a locked category name", () => {
    for (const id of REQUIRED_TEMPLATE_IDS) {
      if (id === "blank") continue;
      expect(getTemplateCategoryName(id)).toBeTruthy();
      expect(isTemplateWithLockedCategory(id)).toBe(true);
    }
  });

  it("reuses an existing category", async () => {
    const createCategory = vi.fn();
    const id = await resolveTemplateCategoryId(
      "prayer",
      [{ id: "cat-prayer", name: "Prayer", createdAt: "", updatedAt: "" }],
      createCategory
    );
    expect(id).toBe("cat-prayer");
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("creates a category when missing", async () => {
    const createCategory = vi.fn().mockResolvedValue({
      id: "cat-new",
      name: "Prayer",
      createdAt: "",
      updatedAt: "",
    });
    const id = await resolveTemplateCategoryId("prayer", [], createCategory);
    expect(id).toBe("cat-new");
    expect(createCategory).toHaveBeenCalledWith("Prayer");
  });
});
