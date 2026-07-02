"use client";

import Link from "next/link";
import { loggedInHomeFeatures } from "@/lib/marketing/logged-in-home-features";

/** Fixed marketing + privacy section on logged-in `/home` (always visible). */
export function LoggedInHomeFeaturesSection() {
  return (
    <section
      aria-label="SelahKeep features and privacy"
      className="border-t border-[var(--border)] pt-10"
      data-testid="logged-in-home-features"
    >
      <h2 className="text-center text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
        {loggedInHomeFeatures.featureHeading}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loggedInHomeFeatures.featureCards.map((card) => (
          <div
            key={card.title}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <h3 className="text-[14.5px] font-semibold text-[var(--foreground)]">{card.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fg-2)]">{card.description}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-center text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
        {loggedInHomeFeatures.privacyHeading}
      </h2>
      <ul className="mx-auto mt-6 max-w-2xl space-y-3 text-[13px] leading-relaxed text-[var(--fg-2)]">
        {loggedInHomeFeatures.privacyPoints.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-sm text-[var(--muted)]">
        You can{" "}
        <Link
          href="/settings/account"
          className="font-semibold text-[var(--primary)] hover:underline"
        >
          manage your account
        </Link>{" "}
        at any time, whether your vault is locked or unlocked.
      </p>
    </section>
  );
}
