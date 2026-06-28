"use client";

import { NOTE_TEMPLATES, type NoteTemplateId } from "@/lib/notes/note-templates";
import { cn } from "@/lib/ui/cn";

interface NoteTemplatePickerProps {
  value: NoteTemplateId;
  onChange: (id: NoteTemplateId) => void;
  disabled?: boolean;
  hideHeader?: boolean;
}

export function NoteTemplatePicker({
  value,
  onChange,
  disabled,
  hideHeader = false,
}: NoteTemplatePickerProps) {
  return (
    <div className="note-template-picker" data-testid="note-template-picker">
      {!hideHeader && (
        <div className="note-template-picker__header">
          <p className="note-template-picker__label" id="note-template-label">
            Start from a template
          </p>
        </div>
      )}
      <div
        className="note-template-picker__options"
        role="radiogroup"
        aria-labelledby={hideHeader ? undefined : "note-template-label"}
        aria-label={hideHeader ? "Start from a template" : undefined}
      >
        {NOTE_TEMPLATES.map((template) => {
          const selected = value === template.id;
          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className={cn(
                "note-template-picker__chip",
                selected && "note-template-picker__chip--selected"
              )}
              onClick={() => onChange(template.id)}
            >
              {template.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
