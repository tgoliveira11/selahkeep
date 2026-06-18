import { describe, it, expect } from "vitest";
import {
  createSavedView,
  addSavedView,
  updateSavedView,
  deleteSavedView,
  getSavedViews,
} from "@/lib/notes/saved-views";
import { createEmptyVaultIndex } from "@/lib/crypto-client/vault-index";

describe("saved views", () => {
  it("creates and stores encrypted-index saved views", () => {
    const view = createSavedView("Unresolved prayers", {
      smartFilter: "unresolved",
      resolved: "unresolved",
      sort: "modified-desc",
    });
    const index = addSavedView(createEmptyVaultIndex(), view);
    expect(getSavedViews(index)).toHaveLength(1);
    expect(getSavedViews(index)[0]?.name).toBe("Unresolved prayers");
  });

  it("updates saved view criteria", () => {
    const view = createSavedView("Work", { smartFilter: "all-active" });
    let index = addSavedView(createEmptyVaultIndex(), view);
    index = updateSavedView(index, view.id, {
      name: "Work notes",
      criteria: { smartFilter: "pinned" },
    });
    const updated = getSavedViews(index)[0];
    expect(updated?.name).toBe("Work notes");
    expect(updated?.criteria.smartFilter).toBe("pinned");
  });

  it("deletes saved views", () => {
    const view = createSavedView("Temp", { smartFilter: "favorites" });
    const index = deleteSavedView(addSavedView(createEmptyVaultIndex(), view), view.id);
    expect(getSavedViews(index)).toHaveLength(0);
  });
});
