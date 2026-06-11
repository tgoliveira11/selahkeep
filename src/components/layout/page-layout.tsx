import { Nav } from "@/components/layout/nav";
import { cn } from "@/lib/ui/cn";
import { MAIN_CONTENT_ID } from "@/lib/ui/main-content";

type PageWidth = "narrow" | "medium" | "wide";

const widthClass: Record<PageWidth, string> = {
  narrow: "max-w-md",
  medium: "max-w-xl",
  wide: "max-w-2xl",
};

interface PageLayoutProps {
  children: React.ReactNode;
  width?: PageWidth;
  className?: string;
  hideNav?: boolean;
}

export function PageLayout({ children, width = "wide", className, hideNav }: PageLayoutProps) {
  return (
    <>
      {!hideNav && <Nav />}
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className={cn("mx-auto px-4 py-8 md:py-10", widthClass[width], className)}
      >
        {children}
      </main>
    </>
  );
}
