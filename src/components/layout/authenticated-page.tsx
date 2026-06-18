import { PageLayout } from "@/components/layout/page-layout";
import { cn } from "@/lib/ui/cn";

export type AuthenticatedPageWidth = "settings" | "notes" | "editor" | "narrow";

interface AuthenticatedPageProps {
  width: AuthenticatedPageWidth;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard SelahKeep authenticated page shell with consistent max-width and padding.
 * @see docs/UI_UX_DIRECTION.md — SelahKeep Authenticated UI Patterns
 */
export function AuthenticatedPage({ width, children, className }: AuthenticatedPageProps) {
  return (
    <PageLayout width={width} className={cn("authenticated-page", className)}>
      {children}
    </PageLayout>
  );
}
