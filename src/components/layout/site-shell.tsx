import { AppHeaderChrome } from "@/components/layout/app-header-chrome";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { RouteScrollToTop } from "@/components/layout/route-scroll-to-top";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Shared product shell. On `md+` for authenticated users a left sidebar
 * (`AppSidebar`) provides primary navigation; on small screens the header
 * menu + fixed bottom nav take over (the sidebar and bottom nav render
 * themselves only when signed in). The header stays as the top bar that hosts
 * the vault status dock.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex">
      <AppSidebar />
      {/* Bottom padding on mobile clears the fixed bottom nav (authenticated only). */}
      <div className="flex min-h-screen flex-1 flex-col pb-[72px] md:min-w-0 md:pb-0">
        <RouteScrollToTop />
        <AppHeaderChrome />
        {children}
        <SiteFooter />
        <MobileBottomNav />
      </div>
    </div>
  );
}
