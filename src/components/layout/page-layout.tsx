import { cn } from "@/lib/ui/cn";
import { MAIN_CONTENT_ID } from "@/lib/ui/main-content";

type PageWidth = "narrow" | "medium" | "wide" | "marketing";

const widthClass: Record<PageWidth, string> = {
  narrow: "max-w-md",
  medium: "max-w-xl",
  wide: "max-w-2xl",
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
      className={cn("mx-auto w-full flex-1 px-4 py-8 md:py-10", widthClass[width], className)}
    >
      {children}
    </main>
  );
}
