"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildVaultUnlockHref } from "@/lib/notes/safe-return-to";
import type { VaultClientStatus } from "@/lib/vault/vault-status";
import { getVaultStatusCopy } from "@/lib/vault/vault-status";

interface VaultStatusPromptProps {
  clientStatus: Exclude<VaultClientStatus, "unlocked">;
  context?: "default" | "settings" | "unlock" | "notes" | "recovery" | "security";
  /** After unlock, return to this route when safe. */
  returnTo?: string;
}

export function VaultStatusPrompt({
  clientStatus,
  context = "default",
  returnTo,
}: VaultStatusPromptProps) {
  const copy = getVaultStatusCopy(clientStatus, context);
  const actionHref =
    clientStatus === "locked" && returnTo
      ? buildVaultUnlockHref(returnTo)
      : copy.actionHref;

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{copy.promptTitle}</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{copy.promptDescription}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href={actionHref}>
          <Button className="w-full sm:w-auto">{copy.promptCta}</Button>
        </Link>
        {copy.secondaryCtaLabel && copy.secondaryCtaHref && (
          <Link href={copy.secondaryCtaHref}>
            <Button variant="secondary" className="w-full sm:w-auto">
              {copy.secondaryCtaLabel}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
