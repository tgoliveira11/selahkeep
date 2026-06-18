"use client";

import { useRouter } from "next/navigation";
import { ToolbarMenu } from "@/components/ui/toolbar-menu";
import { IconPlus } from "@/components/ui/toolbar-icons";
import { NOTE_TEMPLATES, type NoteTemplateId } from "@/lib/notes/note-templates";

/** Templates shown in the primary New note menu (excluding blank — default action). */
export const NEW_NOTE_MENU_TEMPLATE_IDS: NoteTemplateId[] = [
  "prayer",
  "reflection",
  "gratitude",
  "decision",
  "checklist",
  "journal",
];

const templateById = new Map(NOTE_TEMPLATES.map((template) => [template.id, template]));

interface NewNoteActionProps {
  onDailyNote: () => void;
}

/** Primary note creation action with progressive template choices. */
export function NewNoteAction({ onDailyNote }: NewNoteActionProps) {
  const router = useRouter();

  return (
    <ToolbarMenu label="New note" testId="new-note-action" align="end" variant="primary" icon={<IconPlus />}>
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-[var(--radius)] px-2 py-2 text-left text-sm hover:bg-[var(--card-muted)]"
            data-testid="new-note-blank"
            onClick={() => router.push("/notes/new")}
          >
            Blank note
          </button>
        </li>
        <li>
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-[var(--radius)] px-2 py-2 text-left text-sm hover:bg-[var(--card-muted)]"
            data-testid="new-daily-note"
            onClick={onDailyNote}
          >
            Daily note
          </button>
        </li>
        {NEW_NOTE_MENU_TEMPLATE_IDS.map((id) => {
          const template = templateById.get(id);
          if (!template) return null;
          return (
            <li key={id}>
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-[var(--radius)] px-2 py-2 text-left text-sm hover:bg-[var(--card-muted)]"
                data-testid={`new-note-template-${id}`}
                onClick={() => router.push(`/notes/new?template=${id}`)}
              >
                {template.label}
              </button>
            </li>
          );
        })}
      </ul>
    </ToolbarMenu>
  );
}
