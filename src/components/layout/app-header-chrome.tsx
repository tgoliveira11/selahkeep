"use client";

import { useSession } from "next-auth/react";
import { Nav } from "@/components/layout/nav";
import { cn } from "@/lib/ui/cn";

/** Sticky authenticated header chrome. Vault dock handle lives inside `Nav`. */
export function AppHeaderChrome() {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  return (
    <div
      className={cn(
        "sticky top-0 z-40",
        signedIn ? "shadow-[var(--shadow-sm)]" : undefined
      )}
    >
      <Nav />
    </div>
  );
}
