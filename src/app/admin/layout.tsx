import { AdminNav } from "@/components/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AdminNav />
      <main className="mx-auto max-w-[1000px] px-6 py-8">{children}</main>
    </div>
  );
}
