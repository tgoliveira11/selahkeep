"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing/brand";

const CAPABILITIES = [
  "Write private Markdown notes",
  "Organize notes with categories and tags",
  "Mark notes as answered",
  "Search by title, category, or tag after unlocking your vault",
  "Unlock your vault with password, recovery phrase, or a configured passkey",
] as const;

export function NotesWelcome() {
  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Welcome to {PRODUCT_NAME}</h2>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{PRODUCT_TAGLINE}</p>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Before you start writing, you need to create your vault. Your account lets you sign in,
            but your vault protects your private notes separately. During setup, you will choose a
            vault password and save a recovery phrase so only you can unlock your notes.
          </p>
        </div>
        <Link href="/vault/setup">
          <Button className="w-full sm:w-auto">Set up your vault</Button>
        </Link>
      </Card>

      <Card className="space-y-3 p-6">
        <h3 className="font-medium text-[var(--foreground)]">What you can do here</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
          {CAPABILITIES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link href="/vault/settings">
          <Button variant="secondary" className="w-full sm:w-auto">
            Learn about vault protection
          </Button>
        </Link>
      </Card>
    </div>
  );
}
