import type { ResolvedFilter } from "@/lib/crypto-client/note-search";
import type { VaultIndexPlaintext, SavedView } from "@/lib/crypto-client/vault-index-types";
import type { NoteSortOption } from "@/lib/notes/note-sort";
import type { SmartLocalFilter } from "@/lib/notes/smart-filters";

export type SavedViewCriteria = {
  smartFilter: SmartLocalFilter;
  search?: string;
  categoryId?: string | "all" | "none";
  tagId?: string | "all";
  resolved?: ResolvedFilter;
  sort?: NoteSortOption;
};

export function createSavedView(name: string, criteria: SavedViewCriteria, id?: string): SavedView {
  const now = new Date().toISOString();
  return {
    id: id ?? crypto.randomUUID(),
    name: name.trim(),
    criteria,
    createdAt: now,
    updatedAt: now,
  };
}

export function addSavedView(index: VaultIndexPlaintext, view: SavedView): VaultIndexPlaintext {
  const without = (index.savedViews ?? []).filter((v) => v.id !== view.id);
  return {
    ...index,
    savedViews: [...without, view],
  };
}

export function updateSavedView(
  index: VaultIndexPlaintext,
  viewId: string,
  patch: Partial<Pick<SavedView, "name" | "criteria">>
): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return {
    ...index,
    savedViews: (index.savedViews ?? []).map((view) =>
      view.id === viewId
        ? {
            ...view,
            ...patch,
            name: patch.name?.trim() ?? view.name,
            updatedAt: now,
          }
        : view
    ),
  };
}

export function deleteSavedView(index: VaultIndexPlaintext, viewId: string): VaultIndexPlaintext {
  return {
    ...index,
    savedViews: (index.savedViews ?? []).filter((v) => v.id !== viewId),
  };
}

export function getSavedViews(index: VaultIndexPlaintext): SavedView[] {
  return index.savedViews ?? [];
}
