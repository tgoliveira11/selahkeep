interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  /** Optional decorative icon shown in a rounded tile above the title. */
  icon?: React.ReactNode;
  /** When true, render as a calm full-bleed state (no dashed card chrome). */
  plain?: boolean;
}

export function EmptyState({ title, description, action, icon, plain = false }: EmptyStateProps) {
  return (
    <div
      className={
        plain
          ? "px-6 py-20 text-center"
          : "rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--card-muted)] px-6 py-10 text-center"
      }
    >
      {icon && (
        <div
          className="mx-auto mb-5 flex h-[5.75rem] w-[5.75rem] items-center justify-center rounded-[1.625rem] border border-[var(--border)] bg-[var(--lilac-soft,var(--card-muted))] text-[var(--accent)]"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h2 className="text-base font-medium text-[var(--foreground)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
