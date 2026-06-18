import { NOTE_TEMPLATES } from "@/lib/notes/note-templates";

export const RESERVED_CATEGORY_MESSAGE = "This category name is reserved for templates.";

/** Normalize category names for reserved-name comparison (trim, case, accents, spacing). */
export function normalizeCategoryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const RESERVED_NORMALIZED_NAMES = new Set(
  NOTE_TEMPLATES.map((template) => normalizeCategoryName(template.label))
);

/** True when a manual category name matches a template/system category label. */
export function isReservedCategoryName(name: string): boolean {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return false;
  return RESERVED_NORMALIZED_NAMES.has(normalized);
}
