import { AppHeaderChrome } from "@/components/layout/app-header-chrome";
import { SiteFooter } from "@/components/layout/site-footer";

/** Shared product shell: header navigation + footer attribution. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeaderChrome />
      {children}
      <SiteFooter />
    </div>
  );
}
