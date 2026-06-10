import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Letters to God</h1>
        <p className="text-lg text-[var(--muted)] mb-8">
          Your private letters are protected on your device before they are saved. Our systems are
          designed so our team does not have access to the keys required to read them.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button>Get started</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
      </main>
    </>
  );
}
