import { cn } from "@/lib/ui/cn";

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
  variant?: "default" | "danger";
  className?: string;
  /** Hide duplicate headings rendered by embedded secure-auth package pages. */
  suppressPackageHeading?: boolean;
}

/** A single settings section card — avoids nested page-in-card patterns. */
export function SettingsSection({
  title,
  description,
  children,
  id,
  variant = "default",
  className,
  suppressPackageHeading = false,
}: SettingsSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "settings-section rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] sm:p-6",
        variant === "danger" && "settings-section--danger border-[var(--danger)]/25",
        suppressPackageHeading && "settings-section--suppress-package-heading",
        className
      )}
    >
      {title && (
        <header className="settings-section__header mb-4 border-b border-[var(--border)] pb-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
        </header>
      )}
      <div className="settings-section__body">{children}</div>
    </section>
  );
}
