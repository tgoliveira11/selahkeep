import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

interface LetterCardProps {
  id: string;
  title: string;
  createdAt: string;
  answered: boolean;
  locked?: boolean;
}

export function LetterCard({ id, title, createdAt, answered, locked }: LetterCardProps) {
  return (
    <Link
      href={`/letters/${id}`}
      className={cn(
        "block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4",
        "shadow-[var(--shadow-sm)] transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium", locked && "text-[var(--muted)]")}>{title}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {new Date(createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        {answered && <Badge variant="success">Answered</Badge>}
      </div>
    </Link>
  );
}
