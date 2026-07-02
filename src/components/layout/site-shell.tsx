import { AppHeaderChrome } from "@/components/layout/app-header-chrome";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { RouteScrollToTop } from "@/components/layout/route-scroll-to-top";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Shared product shell. On `md+` for authenticated users a left sidebar
 * (`AppSidebar`) provides primary navigation. The header top bar hosts search
 * (notes) and the vault status dock on one row.
 */
export function SiteShell({
  children,
  hideFooter = false,
}: {
  children: React.ReactNode;
  /** The authenticated app shell hides the marketing footer (mockup has none). */
  hideFooter?: boolean;
}) {
  return (
    <div className="md:flex">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col md:min-w-0">
        <RouteScrollToTop />
        <AppHeaderChrome />
        {children}
        {!hideFooter && <SiteFooter />}
      </div>
    </div>
  );
}
