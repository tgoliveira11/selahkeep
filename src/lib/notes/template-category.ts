import type { NoteTemplateId } from "@/lib/notes/note-templates";
import { getNoteTemplate } from "@/lib/notes/note-templates";
import type { VaultCategory } from "@/lib/crypto-client/vault-index-types";

/** Non-blank templates assign a locked category matching the template label. */
export function isTemplateWithLockedCategory(templateId: NoteTemplateId): boolean {
  return templateId !== "blank";
}

/** User-facing category name for a template, or `null` for blank notes. */
export function getTemplateCategoryName(templateId: NoteTemplateId): string | null {
  if (!isTemplateWithLockedCategory(templateId)) return null;
  return getNoteTemplate(templateId).label;
}

/** Reuse an existing category or create one through the encrypted vault index flow. */
export async function resolveTemplateCategoryId(
  templateId: NoteTemplateId,
  categories: VaultCategory[],
  createCategory: (name: string) => Promise<VaultCategory>
): Promise<string | null> {
  const name = getTemplateCategoryName(templateId);
  if (!name) return null;

  const existing = categories.find((category) => category.name === name);
  if (existing) return existing.id;

  const created = await createCategory(name);
  return created.id;
}
