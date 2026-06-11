"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface SocialSignInProps {
  dividerLabel?: string;
}

export function SocialSignIn({ dividerLabel = "or continue with" }: SocialSignInProps) {
  return (
    <>
      <div className="relative text-center text-sm text-[var(--muted)]">
        <span className="relative z-10 bg-[var(--card)] px-2">{dividerLabel}</span>
        <div className="absolute inset-x-0 top-1/2 border-t border-[var(--border)]" aria-hidden="true" />
      </div>

      <div className="space-y-3">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/letters" })}
        >
          Continue with Google
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => signIn("apple", { callbackUrl: "/letters" })}
        >
          Continue with Apple
        </Button>
      </div>
    </>
  );
}
