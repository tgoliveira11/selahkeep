import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";

export default function AccountDeletedPage() {
  return (
    <>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Your account has been deleted</h1>
        <p className="text-sm text-[var(--muted)]">
          Your account and encrypted data have been removed from active storage. Local vault material
          on this browser was cleared when possible.
        </p>
        <Link href="/">
          <Button variant="secondary">Return home</Button>
        </Link>
      </main>
    </>
  );
}
