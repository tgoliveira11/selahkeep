import { TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[220px] w-full resize-y rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-3",
        "text-[var(--foreground)] leading-relaxed placeholder:text-[var(--muted)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
        className
      )}
      {...props}
    />
  );
}
