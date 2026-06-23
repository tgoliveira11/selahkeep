import { cn } from "@/lib/ui/cn";
import { MAIN_CONTENT_ID } from "@/lib/ui/main-content";
import { AUTHENTICATED_WIDTH_CLASS } from "@/lib/ui/authenticated-layout";

type PageWidth = "narrow" | "medium" | "wide" | "settings" | "notes" | "editor" | "dashboard" | "marketing";

/** Standard authenticated widths — see docs/UI_UX_DIRECTION.md */
const widthClass: Record<PageWidth, string> = {
  narrow: "max-w-md",
  medium: "max-w-xl",
  wide: "max-w-2xl",
  settings: AUTHENTICATED_WIDTH_CLASS.settings,
  notes: AUTHENTICATED_WIDTH_CLASS.notes,
  editor: AUTHENTICATED_WIDTH_CLASS.editor,
  dashboard: AUTHENTICATED_WIDTH_CLASS.notes,
  marketing: "max-w-4xl",
};

interface PageLayoutProps {
  children: React.ReactNode;
  width?: PageWidth;
  className?: string;
}

/** Content width wrapper inside {@link SiteShell}; navigation and footer live in route layouts. */
export function PageLayout({ children, width = "wide", className }: PageLayoutProps) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className={cn(
        "mx-auto w-full flex-1 px-4 py-8 sm:px-6 md:py-10 lg:px-8",
        widthClass[width],
        className
      )}
    >
      {children}
    </main>
  );
}
