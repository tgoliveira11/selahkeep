import type {
  VaultCategory,
  VaultIndexNoteEntry,
  VaultTag,
} from "@/lib/crypto-client/vault-index-types";

export function noteListDisplayProps(
  note: VaultIndexNoteEntry,
  categories: VaultCategory[],
  tags: VaultTag[]
) {
  const categoryName = note.categoryId
    ? categories.find((category) => category.id === note.categoryId)?.name ?? null
    : null;
  const tagNames = note.tagIds
    .map((tagId) => tags.find((tag) => tag.id === tagId)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: note.id,
    title: note.title,
    answered: note.answered,
    pinned: note.pinned,
    favorite: note.favorite,
    archived: note.archived,
    trashed: note.trashed,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    categoryName,
    tagNames,
  };
}
