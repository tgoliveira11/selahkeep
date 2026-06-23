"use client";

import Link from "next/link";
import { VaultLockedState } from "@/features/vault/vault-locked-state";

/**
 * Reassurance points shown while the vault is locked. Condensed from the
 * public home privacy copy — relevant context for a signed-in user who can't
 * see note content yet. (While locked, only /account is reachable.)
 */
const LOCKED_REASSURANCE: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: "Encrypted on your device",
    body: "Notes are encrypted before they leave your browser. Only you can read them, and only after you unlock.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="10" width="16" height="11" rx="2.4" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  },
  {
    title: "Sign-in isn't your vault key",
    body: "Your account password signs you in — it does not unlock your vault. Vault recovery is separate.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8" cy="15" r="4" />
        <path d="M10.8 12.2 19 4M16 7l3-3M14 9l1.5 1.5" />
      </svg>
    ),
  },
  {
    title: "On-device dictation",
    body: "Voice dictation runs on this device when enabled — audio and transcripts are never uploaded.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    ),
  },
  {
    title: "Never sold or shared",
    body: "We don't sell your note content, use it for advertising, or share it with anyone.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.4 3 8 7 9 4-1 7-4.6 7-9V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

/** Locked-vault state for /notes — unlock CTA + reassurance (no note content). */
export function NotesVaultProtectedMessage() {
  return (
    <div className="mx-auto max-w-3xl">
      <VaultLockedState variant="notes-list" returnTo="/notes" />

      <section
        aria-label="Your privacy while the vault is locked"
        className="mt-12 border-t border-[var(--border)] pt-10"
      >
        <h2 className="text-center text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
          Your privacy, in plain language
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {LOCKED_REASSURANCE.map((item) => (
            <div
              key={item.title}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--lilac)] text-[var(--primary)]">
                {item.icon}
              </div>
              <h3 className="text-[14.5px] font-semibold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fg-2)]">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          While your vault is locked, you can still{" "}
          <Link
            href="/settings/account"
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            manage your account
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
