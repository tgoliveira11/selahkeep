import { Nav } from "@/components/layout/nav";
import { SiteFooter } from "@/components/layout/site-footer";

/** Shared product shell: header navigation + footer attribution. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      {children}
      <SiteFooter />
    </div>
  );
}
