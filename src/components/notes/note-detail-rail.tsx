import { type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

interface NoteDetailRailCardProps {
  title: string;
  icon?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  testId?: string;
}

/** Shared right-rail card shell (Stillness note detail mockup). */
export function NoteDetailRailCard({
  title,
  icon,
  headerAction,
  children,
  testId,
}: NoteDetailRailCardProps) {
  return (
    <div
      className="note-detail-rail-card overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)]"
      data-testid={testId}
    >
      <div className="note-detail-rail-card__header flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className="note-detail-rail-card__icon flex h-7 w-7 flex-none items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card-muted)] text-[var(--muted)]">
              {icon}
            </span>
          ) : null}
          <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">{title}</p>
        </div>
        {headerAction}
      </div>
      <div className="note-detail-rail-card__body px-4 py-3">{children}</div>
    </div>
  );
}

interface NoteDetailRailRowProps {
  badge: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  testId?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function NoteDetailRailRow({
  badge,
  children,
  action,
  className,
  testId,
  onMouseEnter,
  onMouseLeave,
}: NoteDetailRailRowProps) {
  return (
    <div
      role="listitem"
      className={cn("note-detail-rail-row flex items-start gap-3 py-2.5", className)}
      data-testid={testId}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {badge}
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="flex shrink-0 items-start pt-0.5">{action}</div> : null}
    </div>
  );
}

export function NoteDetailRailBadge({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 flex-none items-center justify-center rounded-full border text-[11px] font-bold",
        active
          ? "border-[var(--border)] bg-[var(--card)] text-[var(--muted)]"
          : "border-transparent bg-[var(--lilac)] text-[var(--primary)]"
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
