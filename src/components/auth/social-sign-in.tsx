"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { MICROSOFT_OAUTH_PROVIDER_ID } from "@/modules/auth/lib/microsoft-provider-config";

interface SocialSignInProps {
  dividerLabel?: string;
}

const OAUTH_CALLBACK_URL = "/letters";

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" },
  { id: MICROSOFT_OAUTH_PROVIDER_ID, label: "Continue with Microsoft" },
] as const;

export function SocialSignIn({ dividerLabel = "or continue with" }: SocialSignInProps) {
  const [availableProviderIds, setAvailableProviderIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/providers")
      .then((response) => (response.ok ? response.json() : {}))
      .then((providers: Record<string, unknown>) => {
        if (!cancelled) {
          setAvailableProviderIds(Object.keys(providers));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableProviderIds([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProviders =
    availableProviderIds === null
      ? SOCIAL_PROVIDERS
      : SOCIAL_PROVIDERS.filter((provider) => availableProviderIds.includes(provider.id));

  if (availableProviderIds !== null && visibleProviders.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative text-center text-sm text-[var(--muted)]">
        <span className="relative z-10 bg-[var(--card)] px-2">{dividerLabel}</span>
        <div className="absolute inset-x-0 top-1/2 border-t border-[var(--border)]" aria-hidden="true" />
      </div>

      <div className="space-y-3">
        {visibleProviders.map((provider) => (
          <Button
            key={provider.id}
            variant="secondary"
            className="w-full"
            onClick={() => signIn(provider.id, { callbackUrl: OAUTH_CALLBACK_URL })}
          >
            {provider.label}
          </Button>
        ))}
      </div>
    </>
  );
}
