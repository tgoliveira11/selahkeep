"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import { NoteAttachmentsField } from "@/features/notes/note-attachments-field";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type {
  KanbanCardPlaintext,
  KanbanLabelPlaintext,
  KanbanPriority,
} from "@/lib/notes/kanban-types";
import { PRIORITY_LABELS } from "@/features/kanban/labels";
import { KanbanCardTagNamesInput } from "@/features/kanban/card-tag-names-input";
import {
  formatDescriptionWithMetadata,
  parseDescriptionMetadata,
} from "@/lib/notes/kanban-card-text";
import {
  kanbanCardStatusHistoryTitle,
  lastKanbanCardStatusChange,
} from "@/lib/notes/kanban-card-status";
import { formatNoteUpdatedShort } from "@/lib/notes/note-dates";

interface KanbanCardDialogProps {
  card: KanbanCardPlaintext | null;
  labels: KanbanLabelPlaintext[];
  tagSuggestions?: string[];
  open: boolean;
  onSave: (card: KanbanCardPlaintext) => void;
  onDelete?: (cardId: string) => void;
  onCancel: () => void;
  boardId: string;
  userId: string | null;
  wrappedKey: EncryptedPayload | null;
  attachmentsEnabled?: boolean;
}

export function KanbanCardDialog({
  card,
  labels,
  tagSuggestions = [],
  open,
  onSave,
  onDelete,
  onCancel,
  boardId,
  userId,
  wrappedKey,
  attachmentsEnabled = true,
}: KanbanCardDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<KanbanCardPlaintext | null>(card);

  useEffect(() => {
    if (!card) {
      setDraft(null);
      return;
    }
    const meta = parseDescriptionMetadata(card.description ?? "");
    setDraft({
      ...card,
      tagNames: card.tagNames ?? meta.tagNames,
      description: meta.body || undefined,
    });
  }, [card]);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open || !draft) return null;

  function update(patch: Partial<KanbanCardPlaintext>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function toggleLabel(labelId: string) {
    if (!draft) return;
    const current = new Set(draft.labelIds ?? []);
    if (current.has(labelId)) current.delete(labelId);
    else current.add(labelId);
    update({ labelIds: [...current] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close card dialog"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kanban-card-dialog-title"
        className="relative w-full max-w-3xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]"
        data-testid="kanban-card-dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="kanban-card-dialog-title" className="text-lg font-semibold">
            Card details
          </h2>
          <span
            className="shrink-0 text-[11px] font-normal text-[var(--muted)]"
            title={kanbanCardStatusHistoryTitle(draft)}
          >
            {formatNoteUpdatedShort(lastKanbanCardStatusChange(draft))}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <FormField id="kanban-card-title" label="Title">
            <input
              id="kanban-card-title"
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={draft.title}
              maxLength={160}
              onChange={(event) => update({ title: event.target.value })}
            />
          </FormField>

          <FormField id="kanban-card-description" label="Description">
            <div className="kanban-card-description-editor">
              <MarkdownEditor
                id="kanban-card-description"
                value={draft.description ?? ""}
                onChange={(description) => update({ description: description || undefined })}
                placeholder="Add context for this card…"
                maxLength={4000}
              />
            </div>
          </FormField>

          <FormField id="kanban-card-tags" label="Tags">
            <KanbanCardTagNamesInput
              id="kanban-card-tags"
              tagNames={draft.tagNames ?? []}
              onTagNamesChange={(tagNames) => update({ tagNames })}
              suggestions={tagSuggestions}
            />
          </FormField>

          <NoteAttachmentsField
            owner={{ kind: "board", id: boardId }}
            userId={userId}
            wrappedKey={wrappedKey}
            enabled={attachmentsEnabled}
            testId="kanban-card-attachments-field"
            filterIds={draft.attachmentIds ?? []}
            onUploaded={(attachmentId) =>
              update({ attachmentIds: [...(draft.attachmentIds ?? []), attachmentId] })
            }
            onRemoved={(attachmentId) =>
              update({
                attachmentIds: (draft.attachmentIds ?? []).filter((id) => id !== attachmentId),
              })
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="kanban-card-due" label="Due date">
              <input
                id="kanban-card-due"
                type="date"
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={draft.dueDate ?? ""}
                onChange={(event) => update({ dueDate: event.target.value || null })}
              />
            </FormField>
            <FormField id="kanban-card-priority" label="Priority">
              <select
                id="kanban-card-priority"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                value={draft.priority ?? ""}
                onChange={(event) =>
                  update({ priority: (event.target.value || null) as KanbanPriority | null })
                }
              >
                <option value="">No priority</option>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {labels.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Labels</legend>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <label
                    key={label.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={draft.labelIds?.includes(label.id) ?? false}
                      onChange={() => toggleLabel(label.id)}
                    />
                    {label.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onDelete && (
            <Button
              type="button"
              variant="danger"
              className="sm:mr-auto"
              onClick={() => onDelete(draft.id)}
            >
              Delete card
            </Button>
          )}
          <Button ref={cancelRef} type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!draft.title.trim()}
            onClick={() =>
              onSave({
                ...draft,
                title: draft.title.trim(),
                updatedAt: new Date().toISOString(),
                description: formatDescriptionWithMetadata(
                  draft.description,
                  draft.dueDate,
                  draft.priority,
                  draft.tagNames
                ),
              })
            }
          >
            Save card
          </Button>
        </div>
      </div>
    </div>
  );
}
