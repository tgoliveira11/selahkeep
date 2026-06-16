import { SiteShell } from "@/components/layout/site-shell";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
