"use client";

import { NOTE_TEMPLATES, type NoteTemplateId } from "@/lib/notes/note-templates";
import { cn } from "@/lib/ui/cn";

interface NoteTemplatePickerProps {
  value: NoteTemplateId;
  onChange: (id: NoteTemplateId) => void;
  disabled?: boolean;
}

export function NoteTemplatePicker({ value, onChange, disabled }: NoteTemplatePickerProps) {
  return (
    <div className="note-template-picker" data-testid="note-template-picker">
      <div className="note-template-picker__header">
        <p className="note-template-picker__label" id="note-template-label">
          Template
        </p>
        <p className="note-template-picker__hint">Choose a starter structure for this note.</p>
      </div>
      <div
        className="note-template-picker__options"
        role="radiogroup"
        aria-labelledby="note-template-label"
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
