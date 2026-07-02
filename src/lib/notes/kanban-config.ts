function readPublic(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Enabled unless KANBAN_ENABLED or NEXT_PUBLIC_KANBAN_ENABLED is explicitly "false". */
export function isKanbanEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const serverFlag = readPublic(env.KANBAN_ENABLED);
  const publicFlag = readPublic(env.NEXT_PUBLIC_KANBAN_ENABLED);
  const value = serverFlag ?? publicFlag;
  return value !== "false";
}
