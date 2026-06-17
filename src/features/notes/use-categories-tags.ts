"use client";

import { useCallback } from "react";
import {
  addVaultCategory,
  addVaultTag,
  deleteVaultCategory,
  deleteVaultTag,
  updateVaultCategory,
  updateVaultTag,
  activeCategories,
  activeTags,
  type VaultCategory,
  type VaultTag,
} from "@/lib/crypto-client/vault-index";
import { useVaultIndex } from "./use-vault-index";

export function useCategoriesTags(userId: string | null, vaultUnlocked: boolean) {
  const { index, mutateIndex, loading, error } = useVaultIndex(userId, vaultUnlocked);

  const createCategory = useCallback(
    async (name: string) => {
      let created: VaultCategory | null = null;
      await mutateIndex((current) => {
        const result = addVaultCategory(current, name);
        created = result.category;
        return result.index;
      });
      if (!created) throw new Error("Failed to create category");
      return created;
    },
    [mutateIndex]
  );

  const renameCategory = useCallback(
    async (categoryId: string, name: string) => mutateIndex((current) => updateVaultCategory(current, categoryId, name)),
    [mutateIndex]
  );

  const removeCategory = useCallback(
    async (categoryId: string) => mutateIndex((current) => deleteVaultCategory(current, categoryId)),
    [mutateIndex]
  );

  const createTag = useCallback(
    async (name: string) => {
      let created: VaultTag | null = null;
      await mutateIndex((current) => {
        const result = addVaultTag(current, name);
        created = result.tag;
        return result.index;
      });
      if (!created) throw new Error("Failed to create tag");
      return created;
    },
    [mutateIndex]
  );

  const renameTag = useCallback(
    async (tagId: string, name: string) => mutateIndex((current) => updateVaultTag(current, tagId, name)),
    [mutateIndex]
  );

  const removeTag = useCallback(
    async (tagId: string) => mutateIndex((current) => deleteVaultTag(current, tagId)),
    [mutateIndex]
  );

  return {
    categories: index ? activeCategories(index) : [],
    tags: index ? activeTags(index) : [],
    loading,
    error,
    createCategory,
    renameCategory,
    removeCategory,
    createTag,
    renameTag,
    removeTag,
  };
}
