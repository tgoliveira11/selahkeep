"use client";

import { useState } from "react";
import Link from "next/link";
import { RESOLVED_COPY } from "@/lib/notes/resolved-labels";
import {
  isReservedCategoryName,
  RESERVED_CATEGORY_MESSAGE,
} from "@/lib/notes/reserved-category-names";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { TagChipInput } from "@/features/notes/tag-chip-input";
import type { VaultCategory, VaultTag } from "@/lib/crypto-client/vault-index-types";

interface NoteCategoryFieldProps {
  categories: VaultCategory[];
  categoryId: string | null;
  categoryLocked?: boolean;
  lockedCategoryName?: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onCreateCategory?: (name: string) => Promise<VaultCategory>;
}

/** Category field for note create/edit — manual selection or template-locked read-only. */
export function NoteCategoryField({
  categories,
  categoryId,
  categoryLocked = false,
  lockedCategoryName,
  onCategoryChange,
  onCreateCategory,
}: NoteCategoryFieldProps) {
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const resolvedCategoryName =
    lockedCategoryName ??
    categories.find((category) => category.id === categoryId)?.name ??
    null;

  async function handleAddCategory() {
    const name = newCategory.trim();
    if (!name || !onCreateCategory) return;

    if (isReservedCategoryName(name)) {
      setCategoryError(RESERVED_CATEGORY_MESSAGE);
      return;
    }

    setCategoryError(null);
    const created = await onCreateCategory(name);
    onCategoryChange(created.id);
    setNewCategory("");
  }

  if (categoryLocked && resolvedCategoryName) {
    return (
      <FormField id="note-category" label="Category">
        <div
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2.5"
          data-testid="template-locked-category"
        >
          <p className="text-sm text-[var(--muted)]">
            This note will be organized under{" "}
            <span className="font-medium text-[var(--foreground)]">{resolvedCategoryName}</span>.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Assigned automatically by the selected template.
          </p>
        </div>
      </FormField>
    );
  }

  const hasDropdown = categories.length > 0;

  if (!hasDropdown && !onCreateCategory) {
    return (
      <p className="text-sm text-[var(--muted)]">
        You can add categories later from{" "}
        <Link href="/vault/settings" className="font-medium text-[var(--primary)] hover:underline">
          vault settings
        </Link>
        .
      </p>
    );
  }

  return (
    <FormField id="note-category" label="Category">
      {hasDropdown && (
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
      )}
      {onCreateCategory && (
        <div className={hasDropdown ? "mt-2 flex gap-2" : "flex gap-2"}>
          <Input
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => {
              setNewCategory(e.target.value);
              if (categoryError) setCategoryError(null);
            }}
            maxLength={80}
            aria-invalid={Boolean(categoryError)}
            aria-describedby={categoryError ? "note-category-error" : undefined}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleAddCategory()}
            disabled={!newCategory.trim()}
          >
            Add
          </Button>
        </div>
      )}
      {categoryError && (
        <p id="note-category-error" className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {categoryError}
        </p>
      )}
    </FormField>
  );
}

interface CategoryTagFieldsProps {
  mode: "create" | "edit";
  categories: VaultCategory[];
  tags: VaultTag[];
  categoryId: string | null;
  tagIds: string[];
  answered?: boolean;
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
  const showCategory = categories.length > 0 || categoryLocked;
  const showAnswered = mode === "edit" && onAnsweredChange;

  return (
    <div className="space-y-4">
      {showCategory ? (
        <NoteCategoryField
          categories={categories}
          categoryId={categoryId}
          categoryLocked={categoryLocked}
          lockedCategoryName={lockedCategoryName}
          onCategoryChange={onCategoryChange}
          onCreateCategory={onCreateCategory}
        />
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
