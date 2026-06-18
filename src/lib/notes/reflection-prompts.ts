export type ReflectionPrompt = {
  id: string;
  text: string;
  context: ("new-note" | "weekly-reflection" | "empty-state" | "remembrance")[];
};

/** Static local writing prompts — no AI, no network. */
export const REFLECTION_PROMPTS: ReflectionPrompt[] = [
  {
    id: "grateful-today",
    text: "What am I grateful for today?",
    context: ["new-note", "weekly-reflection", "empty-state"],
  },
  {
    id: "avoiding",
    text: "What am I avoiding?",
    context: ["new-note", "empty-state"],
  },
  {
    id: "surrender",
    text: "What do I need to surrender?",
    context: ["new-note", "remembrance"],
  },
  {
    id: "remember-today",
    text: "What should I remember from today?",
    context: ["new-note", "weekly-reflection", "remembrance"],
  },
  {
    id: "decision-clarity",
    text: "What decision needs clarity?",
    context: ["new-note", "empty-state"],
  },
  {
    id: "carry-forward",
    text: "What should I carry forward into next week?",
    context: ["weekly-reflection"],
  },
  {
    id: "once-carried",
    text: "What did I once carry that I can release?",
    context: ["remembrance", "empty-state"],
  },
  {
    id: "open-heart",
    text: "What is my heart still holding?",
    context: ["remembrance", "weekly-reflection"],
  },
];

export function promptsForContext(
  context: ReflectionPrompt["context"][number]
): ReflectionPrompt[] {
  return REFLECTION_PROMPTS.filter((prompt) => prompt.context.includes(context));
}

/** Insert prompt as markdown heading + blank line for the editor. */
export function promptToEditorInsert(text: string): string {
  return `## ${text}\n\n`;
}
