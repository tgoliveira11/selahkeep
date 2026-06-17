"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import type { VaultCategory, VaultTag } from "@/lib/crypto-client/vault-index-types";

interface CategoryTagFieldsProps {
  categories: VaultCategory[];
  tags: VaultTag[];
  categoryId: string | null;
  tagIds: string[];
  answered: boolean;
  onCategoryChange: (categoryId: string | null) => void;
  onTagIdsChange: (tagIds: string[]) => void;
  onAnsweredChange: (answered: boolean) => void;
  onCreateCategory?: (name: string) => Promise<VaultCategory>;
  onCreateTag?: (name: string) => Promise<VaultTag>;
}

export function CategoryTagFields({
  categories,
  tags,
  categoryId,
  tagIds,
  answered,
  onCategoryChange,
  onTagIdsChange,
  onAnsweredChange,
  onCreateCategory,
  onCreateTag,
}: CategoryTagFieldsProps) {
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");

  async function handleAddCategory() {
    const name = newCategory.trim();
    if (!name || !onCreateCategory) return;
    const created = await onCreateCategory(name);
    onCategoryChange(created.id);
    setNewCategory("");
  }

  async function handleAddTag() {
    const name = newTag.trim();
    if (!name || !onCreateTag) return;
    const created = await onCreateTag(name);
    onTagIdsChange([...tagIds, created.id]);
    setNewTag("");
  }

  function toggleTag(tagId: string) {
    if (tagIds.includes(tagId)) {
      onTagIdsChange(tagIds.filter((id) => id !== tagId));
    } else {
      onTagIdsChange([...tagIds, tagId]);
    }
  }

  return (
    <div className="space-y-4">
      <FormField id="note-category" label="Category">
        <select
          id="note-category"
          className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          value={categoryId ?? ""}
          onChange={(e) => onCategoryChange(e.target.value || null)}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {onCreateCategory && (
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              maxLength={80}
            />
            <Button type="button" variant="secondary" onClick={handleAddCategory} disabled={!newCategory.trim()}>
              Add
            </Button>
          </div>
        )}
      </FormField>

      <FormField id="note-tags" label="Tags">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const selected = tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selected
                    ? "bg-[var(--primary)] text-white"
                    : "border border-[var(--border)] bg-[var(--card-muted)] text-[var(--foreground)]"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
        {onCreateTag && (
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="New tag name"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              maxLength={80}
            />
            <Button type="button" variant="secondary" onClick={handleAddTag} disabled={!newTag.trim()}>
              Add
            </Button>
          </div>
        )}
      </FormField>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={answered}
          onChange={(e) => onAnsweredChange(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)]"
        />
        Mark as answered
      </label>
    </div>
  );
}
