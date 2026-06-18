"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolbarMenu } from "@/components/ui/toolbar-menu";
import { IconViews } from "@/components/ui/toolbar-icons";
import type { SavedView } from "@/lib/crypto-client/vault-index-types";
import type { SavedViewCriteria } from "@/lib/notes/saved-views";

interface SavedViewsMenuProps {
  views: SavedView[];
  activeViewId: string | null;
  currentCriteria: SavedViewCriteria;
  onApply: (view: SavedView) => void;
  onSave: (name: string, criteria: SavedViewCriteria) => void;
  onDelete: (viewId: string) => void;
  onRecentlyViewed?: () => void;
}

/** Secondary saved views menu — not a large always-visible panel. */
export function SavedViewsMenu({
  views,
  activeViewId,
  currentCriteria,
  onApply,
  onSave,
  onDelete,
  onRecentlyViewed,
}: SavedViewsMenuProps) {
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
    <ToolbarMenu
      label="Views"
      testId="saved-views-menu"
      active={Boolean(activeViewId)}
      icon={<IconViews />}
    >
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Reflective views</p>
        <ul className="space-y-1">
          <li>
            <Link
              href="/notes/remembrance"
              role="menuitem"
              className="block w-full rounded-[var(--radius)] px-2 py-2 text-left text-sm hover:bg-[var(--card-muted)]"
              data-testid="view-remembrance"
            >
              Remembrance
            </Link>
          </li>
          <li>
            <Link
              href="/notes/weekly-reflection"
              role="menuitem"
              className="block w-full rounded-[var(--radius)] px-2 py-2 text-left text-sm hover:bg-[var(--card-muted)]"
              data-testid="view-weekly-reflection"
            >
              Weekly reflection
            </Link>
          </li>
          {onRecentlyViewed && (
            <li>
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-[var(--radius)] px-2 py-2 text-left text-sm hover:bg-[var(--card-muted)]"
                data-testid="view-recently-viewed"
                onClick={onRecentlyViewed}
              >
                Recently viewed
              </button>
            </li>
          )}
        </ul>

        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Saved views</p>
        {views.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No saved views yet</p>
        ) : (
          <ul className="space-y-1">
            {views.map((view) => (
              <li key={view.id}>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full rounded-[var(--radius)] px-2 py-2 text-left text-sm hover:bg-[var(--card-muted)]"
                  data-testid={`saved-view-item-${view.id}`}
                  onClick={() => onApply(view)}
                >
                  {view.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {saveOpen ? (
          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            <Input
              aria-label="View name"
              data-testid="saved-view-name"
              value={name}
              placeholder="e.g. Unresolved prayers"
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="button" className="w-full min-h-9" disabled={!name.trim()} onClick={handleSave}>
              Save view
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-full min-h-9"
            data-testid="save-current-view"
            onClick={() => setSaveOpen(true)}
          >
            Save current view
          </Button>
        )}
        {activeViewId && (
          <Button
            type="button"
            variant="danger"
            className="w-full min-h-9"
            data-testid="delete-saved-view"
            onClick={() => onDelete(activeViewId)}
          >
            Delete saved view
          </Button>
        )}
      </div>
    </ToolbarMenu>
  );
}
