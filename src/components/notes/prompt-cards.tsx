"use client";

import { promptsForContext, promptToEditorInsert, type ReflectionPrompt } from "@/lib/notes/reflection-prompts";
import { Button } from "@/components/ui/button";

interface PromptCardsProps {
  context: ReflectionPrompt["context"][number];
  onInsert: (markdown: string) => void;
  className?: string;
}

/** Static local writing prompts — insert into editor, no network. */
export function PromptCards({ context, onInsert, className }: PromptCardsProps) {
  const prompts = promptsForContext(context);
  if (prompts.length === 0) return null;

  return (
    <section
      className={className}
      data-testid={`prompt-cards-${context}`}
      aria-label="Writing prompts"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        Prompts
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt.id}
            type="button"
            variant="secondary"
            className="min-h-9 text-left text-sm"
            data-testid={`prompt-card-${prompt.id}`}
            onClick={() => onInsert(promptToEditorInsert(prompt.text))}
          >
            {prompt.text}
          </Button>
        ))}
      </div>
    </section>
  );
}
