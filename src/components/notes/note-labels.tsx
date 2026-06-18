import { Badge } from "@/components/ui/badge";
import { formatTagDisplay } from "@/lib/notes/tag-normalization";
import { cn } from "@/lib/ui/cn";

interface NoteCategoryLabelProps {
  name: string;
  className?: string;
}

export function NoteCategoryLabel({ name, className }: NoteCategoryLabelProps) {
  return (
    <Badge
      variant="info"
      className={cn("gap-1 rounded-md px-2.5 py-1 text-xs font-medium", className)}
    >
      <span aria-hidden="true">📁</span>
      <span>{name}</span>
    </Badge>
  );
}

interface NoteTagChipProps {
  name: string;
  className?: string;
  onRemove?: () => void;
}

export function NoteTagChip({ name, className, onRemove }: NoteTagChipProps) {
  const label = formatTagDisplay(name);

  if (onRemove) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--primary)]",
          className
        )}
      >
        <span>{label}</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-1 text-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label={`Remove tag ${label}`}
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--primary)]",
        className
      )}
    >
      {label}
    </span>
  );
}
