function readPublic(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Enabled unless NEXT_PUBLIC_KANBAN_ENABLED is explicitly "false". */
export function isKanbanEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_KANBAN_ENABLED
): boolean {
  return readPublic(value) !== "false";
}
