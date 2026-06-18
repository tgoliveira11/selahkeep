import type { VaultIndexNoteEntry, VaultCategory } from "@/lib/crypto-client/vault-index-types";
import { isActiveNoteEntry } from "@/lib/notes/smart-filters";

export const WEEKLY_REFLECTION_CATEGORY = "Weekly Reflection";
export const GRATITUDE_CATEGORY = "Gratitude";

export type WeekBounds = {
  start: Date;
  end: Date;
  label: string;
};

/** Local-timezone week: Monday 00:00 through Sunday 23:59:59.999 */
export function getLocalWeekBounds(reference = new Date()): WeekBounds {
  const local = new Date(reference);
  const day = local.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(local);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  const label = `${formatter.format(start)} – ${formatter.format(end)}`;

  return { start, end, label };
}

export function isDateInWeek(iso: string, bounds: WeekBounds): boolean {
  const time = new Date(iso).getTime();
  return time >= bounds.start.getTime() && time <= bounds.end.getTime();
}

export function findCategoryIdByName(
  categories: VaultCategory[],
  name: string
): string | null {
  const normalized = name.trim().toLowerCase();
  const match = categories.find(
    (category) => !category.deletedAt && category.name.trim().toLowerCase() === normalized
  );
  return match?.id ?? null;
}

export type WeeklyReflectionSections = {
  createdThisWeek: VaultIndexNoteEntry[];
  resolvedThisWeek: VaultIndexNoteEntry[];
  gratitudeNotes: VaultIndexNoteEntry[];
  openReflections: VaultIndexNoteEntry[];
};

export function buildWeeklyReflectionSections(
  entries: VaultIndexNoteEntry[],
  categories: VaultCategory[],
  bounds = getLocalWeekBounds()
): WeeklyReflectionSections {
  const active = entries.filter(isActiveNoteEntry);
  const gratitudeCategoryId = findCategoryIdByName(categories, GRATITUDE_CATEGORY);

  return {
    createdThisWeek: active.filter((entry) => isDateInWeek(entry.createdAt, bounds)),
    resolvedThisWeek: active.filter(
      (entry) => entry.answered && entry.resolvedAt && isDateInWeek(entry.resolvedAt, bounds)
    ),
    gratitudeNotes: active.filter(
      (entry) => gratitudeCategoryId !== null && entry.categoryId === gratitudeCategoryId
    ),
    openReflections: active.filter((entry) => !entry.answered),
  };
}

export function buildWeeklyReflectionNoteBody(
  sections: WeeklyReflectionSections,
  bounds: WeekBounds
): string {
  const lines = [`# Weekly Reflection — ${bounds.label}`, ""];
  const section = (title: string, notes: VaultIndexNoteEntry[]) => {
    lines.push(`## ${title}`);
    if (notes.length === 0) {
      lines.push("_None this week._");
    } else {
      for (const note of notes) {
        lines.push(`- ${note.title}`);
      }
    }
    lines.push("");
  };

  section("Notes created this week", sections.createdThisWeek);
  section("Notes resolved this week", sections.resolvedThisWeek);
  section("Gratitude notes", sections.gratitudeNotes);
  section("Open reflections", sections.openReflections);
  lines.push("## What should I carry forward?");
  lines.push("");
  lines.push("_Write what you want to remember and bring into the week ahead._");

  return lines.join("\n");
}
