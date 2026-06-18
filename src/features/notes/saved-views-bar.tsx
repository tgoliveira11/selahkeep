"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import type { SavedView } from "@/lib/crypto-client/vault-index-types";
import type { SavedViewCriteria } from "@/lib/notes/saved-views";

interface SavedViewsBarProps {
  views: SavedView[];
  activeViewId: string | null;
  currentCriteria: SavedViewCriteria;
  onApply: (view: SavedView) => void;
  onSave: (name: string, criteria: SavedViewCriteria) => void;
  onDelete: (viewId: string) => void;
}

export function SavedViewsBar({
  views,
  activeViewId,
  currentCriteria,
  onApply,
  onSave,
  onDelete,
}: SavedViewsBarProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, currentCriteria);
    setName("");
    setSaveOpen(false);
  }

  return (
    <div className="mb-4 space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-end gap-2">
        <FormField id="saved-view-select" label="Saved views" className="min-w-[12rem] flex-1">
          <select
            id="saved-view-select"
            data-testid="saved-view-select"
            className="w-full min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={activeViewId ?? ""}
            onChange={(e) => {
              const view = views.find((item) => item.id === e.target.value);
              if (view) onApply(view);
            }}
          >
            <option value="">Select a saved view…</option>
            {views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
        </FormField>
        <Button type="button" variant="secondary" onClick={() => setSaveOpen((v) => !v)}>
          Save current view
        </Button>
      </div>

      {saveOpen && (
        <div className="flex flex-wrap items-end gap-2">
          <FormField id="saved-view-name" label="View name" className="min-w-[12rem] flex-1">
            <Input
              id="saved-view-name"
              data-testid="saved-view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Unresolved prayers"
            />
          </FormField>
          <Button type="button" onClick={handleSave} disabled={!name.trim()} className="min-h-9 px-3 py-1.5">
            Save
          </Button>
        </div>
      )}

      {activeViewId && (
        <Button
          type="button"
          variant="danger"
          className="min-h-9 px-3 py-1.5"
          data-testid="delete-saved-view"
          onClick={() => onDelete(activeViewId)}
        >
          Delete saved view
        </Button>
      )}
    </div>
  );
}
