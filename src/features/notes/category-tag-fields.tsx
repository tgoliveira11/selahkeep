"use client";

import { useState } from "react";
import Link from "next/link";
import { RESOLVED_COPY } from "@/lib/notes/resolved-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { TagChipInput } from "@/features/notes/tag-chip-input";
import type { VaultCategory, VaultTag } from "@/lib/crypto-client/vault-index-types";

interface CategoryTagFieldsProps {
  mode: "create" | "edit";
  categories: VaultCategory[];
  tags: VaultTag[];
  categoryId: string | null;
  tagIds: string[];
  answered?: boolean;
  /** Template-assigned category cannot be changed during note creation. */
  categoryLocked?: boolean;
  lockedCategoryName?: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onTagIdsChange: (tagIds: string[]) => void;
  onAnsweredChange?: (answered: boolean) => void;
  onCreateCategory?: (name: string) => Promise<VaultCategory>;
  onCreateTag: (name: string) => Promise<VaultTag>;
}

export function CategoryTagFields({
  mode,
  categories,
  tags,
  categoryId,
  tagIds,
  answered = false,
  onCategoryChange,
  onTagIdsChange,
  onAnsweredChange,
  onCreateCategory,
  onCreateTag,
  categoryLocked = false,
  lockedCategoryName,
}: CategoryTagFieldsProps) {
  const [newCategory, setNewCategory] = useState("");
  const showCategory = categories.length > 0 || categoryLocked;
  const showAnswered = mode === "edit" && onAnsweredChange;
  const resolvedCategoryName =
    lockedCategoryName ??
    categories.find((category) => category.id === categoryId)?.name ??
    null;

  async function handleAddCategory() {
    const name = newCategory.trim();
    if (!name || !onCreateCategory) return;
    const created = await onCreateCategory(name);
    onCategoryChange(created.id);
    setNewCategory("");
  }

  return (
    <div className="space-y-4">
      {showCategory ? (
        <FormField id="note-category" label="Category">
          {categoryLocked && resolvedCategoryName ? (
            <div
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2.5"
              data-testid="template-locked-category"
            >
              <p className="text-sm font-medium text-[var(--foreground)]">{resolvedCategoryName}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                This category is assigned by the template.
              </p>
            </div>
          ) : (
            <>
              <select
                id="note-category"
                className="w-full min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                value={categoryId ?? ""}
                onChange={(e) => onCategoryChange(e.target.value || null)}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
            </>
          )}
        </FormField>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          You can add categories later from{" "}
          <Link href="/vault/settings" className="font-medium text-[var(--primary)] hover:underline">
            vault settings
          </Link>
          .
        </p>
      )}

      <FormField id="note-tags" label="Tags">
        <TagChipInput
          tags={tags}
          tagIds={tagIds}
          onTagIdsChange={onTagIdsChange}
          onCreateTag={onCreateTag}
        />
      </FormField>

      {showAnswered && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={answered}
            onChange={(e) => onAnsweredChange?.(e.target.checked)}
            aria-label={RESOLVED_COPY.toggleLabel}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          {RESOLVED_COPY.toggleLabel}
        </label>
      )}
    </div>
  );
}
