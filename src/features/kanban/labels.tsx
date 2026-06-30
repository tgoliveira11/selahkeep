"use client";

import type {
  KanbanLabelPlaintext,
  KanbanPriority,
} from "@/lib/notes/kanban-types";
import { DEFAULT_KANBAN_LABEL_COLORS } from "@/lib/notes/kanban-types";
import { cn } from "@/lib/ui/cn";

export const PRIORITY_LABELS: Record<NonNullable<KanbanPriority>, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_CLASS: Record<NonNullable<KanbanPriority>, string> = {
  low: "border-[var(--border-2)] text-[var(--muted)]",
  medium: "border-[var(--info-bd)] text-[var(--info)]",
  high: "border-[var(--warning-bd)] text-[var(--warning)]",
  urgent: "border-[var(--danger-bd)] text-[var(--danger)]",
};

const LABEL_COLOR_CLASS: Record<KanbanLabelPlaintext["color"], string> = {
  lilac: "border-[var(--border-2)] text-[var(--primary)]",
  success: "border-[var(--success-bd)] text-[var(--success)]",
  warning: "border-[var(--warning-bd)] text-[var(--warning)]",
  danger: "border-[var(--danger-bd)] text-[var(--danger)]",
  info: "border-[var(--info-bd)] text-[var(--info)]",
  accent: "border-[var(--border-2)] text-[var(--accent)]",
};

export function KanbanPriorityChip({ priority }: { priority?: KanbanPriority | null }) {
  if (!priority) return null;
  return (
    <span
      className={cn(
        "inline-flex rounded-full border bg-transparent px-2 py-0.5 text-[11px] font-semibold",
        PRIORITY_CLASS[priority]
      )}
      data-testid={`kanban-priority-${priority}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function KanbanLabelChip({ label }: { label: KanbanLabelPlaintext }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border bg-transparent px-2 py-0.5 text-[11px] font-semibold",
        LABEL_COLOR_CLASS[label.color]
      )}
    >
      {label.name}
    </span>
  );
}

interface KanbanLabelManagerProps {
  labels: KanbanLabelPlaintext[];
  onChange: (labels: KanbanLabelPlaintext[]) => void;
}

export function KanbanLabelManager({ labels, onChange }: KanbanLabelManagerProps) {
  function addLabel() {
    onChange([
      ...labels,
      {
        id: crypto.randomUUID(),
        name: "New label",
        color: DEFAULT_KANBAN_LABEL_COLORS[labels.length % DEFAULT_KANBAN_LABEL_COLORS.length],
      },
    ]);
  }

  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Labels</h3>
        <button
          type="button"
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--primary)]"
          onClick={addLabel}
        >
          Add label
        </button>
      </div>
      <div className="space-y-2">
        {labels.map((label) => (
          <div key={label.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
            <input
              aria-label={`Label name ${label.name}`}
              className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
              value={label.name}
              onChange={(event) =>
                onChange(
                  labels.map((item) =>
                    item.id === label.id ? { ...item, name: event.target.value } : item
                  )
                )
              }
            />
            <select
              aria-label={`Label color ${label.name}`}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm"
              value={label.color}
              onChange={(event) =>
                onChange(
                  labels.map((item) =>
                    item.id === label.id
                      ? { ...item, color: event.target.value as KanbanLabelPlaintext["color"] }
                      : item
                  )
                )
              }
            >
              {DEFAULT_KANBAN_LABEL_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--danger)]"
              onClick={() => onChange(labels.filter((item) => item.id !== label.id))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
