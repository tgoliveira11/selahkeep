"use client";

import type { ReactNode } from "react";
import { LoggedInHomeFeaturesSection } from "@/features/vault/logged-in-home-features-section";

interface LoggedInHomeShellProps {
  hero: ReactNode;
}

/** Shared `/home` layout: fixed-height hero + always-visible features section. */
export function LoggedInHomeShell({ hero }: LoggedInHomeShellProps) {
  return (
    <div className="mx-auto max-w-5xl" data-testid="logged-in-home-shell">
      <div
        className="logged-in-home-hero flex min-h-[17.5rem] flex-col items-center justify-center px-2 text-center"
        data-testid="logged-in-home-hero"
      >
        {hero}
      </div>
      <LoggedInHomeFeaturesSection />
    </div>
  );
}
