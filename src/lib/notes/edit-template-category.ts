import type { VaultCategory } from "@/lib/crypto-client/vault-index-types";
import { isReservedCategoryName } from "@/lib/notes/reserved-category-names";

/** Whether a note's category is a template-assigned (read-only) category. */
export function isTemplateLockedCategory(
  categoryId: string | null,
  categories: VaultCategory[]
): boolean {
  if (!categoryId) return false;
  const category = categories.find((item) => item.id === categoryId);
  if (!category || category.deletedAt) return false;
  return isReservedCategoryName(category.name);
}

export function getLockedCategoryDisplayName(
  categoryId: string | null,
  categories: VaultCategory[]
): string | null {
  if (!categoryId) return null;
  const category = categories.find((item) => item.id === categoryId);
  return category?.name ?? null;
}
