import { SiteShell } from "@/components/layout/site-shell";
import { MAIN_CONTENT_ID } from "@/lib/ui/main-content";

/** Site chrome around @tgoliveira/secure-auth pages (package owns inner auth UI). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1">
        {children}
      </main>
    </SiteShell>
  );
}
