import type { ReactNode } from "react";

export type NotFoundVariant = "page" | "note";

const copy: Record<
  NotFoundVariant,
  { title: string; description: string; badge: string }
> = {
  page: {
    badge: "404",
    title: "Page not found",
    description:
      "This page may have moved, been deleted, or never existed. Your vault and private notes are safe.",
  },
  note: {
    badge: "404",
    title: "Note not found",
    description:
      "This note may have been moved, deleted, or may not exist in this vault.",
  },
};

function NotFoundIcon() {
  return (
    <span
      className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--primary)]"
      aria-hidden
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export interface NotFoundStateProps {
  variant?: NotFoundVariant;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

/** Calm SelahKeep empty-state for missing pages and private resources. */
export function NotFoundState({
  variant = "page",
  title,
  description,
  actions,
}: NotFoundStateProps) {
  const defaults = copy[variant];

  return (
    <section
      className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center shadow-[var(--shadow-sm)]"
      data-testid="not-found-state"
      aria-labelledby="not-found-title"
    >
      <NotFoundIcon />
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--accent)]">
        {defaults.badge}
      </p>
      <h1 id="not-found-title" className="mt-2 text-xl font-semibold text-[var(--foreground)]">
        {title ?? defaults.title}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
        {description ?? defaults.description}
      </p>
      {actions ? <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </section>
  );
}
