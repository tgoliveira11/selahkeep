import { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2",
        "text-[var(--foreground)] placeholder:text-[var(--muted)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
        className
      )}
      {...props}
    />
  );
}
