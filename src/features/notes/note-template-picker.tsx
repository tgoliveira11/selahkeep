"use client";

import { NOTE_TEMPLATES, type NoteTemplateId } from "@/lib/notes/note-templates";
import { FormField } from "@/components/ui/form-field";

interface NoteTemplatePickerProps {
  value: NoteTemplateId;
  onChange: (id: NoteTemplateId) => void;
  disabled?: boolean;
}

export function NoteTemplatePicker({ value, onChange, disabled }: NoteTemplatePickerProps) {
  return (
    <FormField id="note-template" label="Template" hint="Optional starter content">
      <select
        id="note-template"
        className="w-full min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as NoteTemplateId)}
      >
        {NOTE_TEMPLATES.map((template) => (
          <option key={template.id} value={template.id}>
            {template.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
