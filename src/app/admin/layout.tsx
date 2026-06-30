import { AdminNav } from "@/components/admin-nav";
import { OutpostAdminProvider } from "@/components/outpost-admin-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <OutpostAdminProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <AdminNav />
        <main className="mx-auto max-w-[1000px] px-6 py-8">{children}</main>
      </div>
    </OutpostAdminProvider>
  );
}
