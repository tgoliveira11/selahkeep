import { AdminNav } from "@/components/admin-nav";
import { OutpostAdminProvider } from "@/components/outpost-admin-provider";
import { buildOutpostEnvConfig } from "@/lib/env/outpost-from-env";
import { ensureAdminBootstrapAccess } from "@/lib/secure-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await ensureAdminBootstrapAccess();

  const { adminPath: outpostAdminPath } = buildOutpostEnvConfig();

  return (
    <OutpostAdminProvider adminPanelPath={outpostAdminPath}>
      <div className="min-h-screen bg-[var(--background)]">
        <AdminNav outpostAdminBase={outpostAdminPath} />
        <main className="mx-auto max-w-[1000px] px-6 py-8">{children}</main>
      </div>
    </OutpostAdminProvider>
  );
}
