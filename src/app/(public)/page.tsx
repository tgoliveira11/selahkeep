import { PublicCtaButtons } from "@/components/marketing/public-cta-buttons";
import { PageLayout } from "@/components/layout/page-layout";
import { homeCopy } from "@/lib/marketing/home-copy";

/** Icons for the four "What you can do" cards, in copy order. */
const FEATURE_ICONS: React.ReactNode[] = [
  // Pause and reflect
  <svg key="reflect" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3c0 6-3 9-6 10 3 1 6 4 6 8 0-4 3-7 6-8-3-1-6-4-6-10Z" />
  </svg>,
  // Keep everything in one vault
  <svg key="vault" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="2.4" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>,
  // Mark as resolved
  <svg key="resolved" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>,
  // Recover thoughtfully
  <svg key="recover" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="15" r="4" />
    <path d="M10.8 12.2 19 4M16 7l3-3M14 9l1.5 1.5" />
  </svg>,
];

export default function HomePage() {
  return (
    <PageLayout width="marketing" className="space-y-16 md:space-y-24">
      {/* Hero */}
      <section
        aria-labelledby="home-hero-heading"
        className="mx-auto flex max-w-2xl flex-col items-center space-y-6 pt-6 text-center md:pt-10"
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-[1.375rem] border border-[var(--border)] bg-[var(--lilac-soft)] text-[var(--primary)] shadow-[var(--shadow-sm)]"
          aria-hidden="true"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c0 6-3 9-6 10 3 1 6 4 6 8 0-4 3-7 6-8-3-1-6-4-6-10Z" />
          </svg>
        </div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          {homeCopy.hero.eyebrow}
        </p>
        <div className="space-y-4">
          <h1
            id="home-hero-heading"
            className="text-4xl font-semibold tracking-[-0.02em] text-[var(--foreground)] md:text-[3.25rem] md:leading-[1.05]"
          >
            {homeCopy.hero.title}
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-[var(--fg-2)]">
            {homeCopy.hero.subtitle}
          </p>
        </div>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          {homeCopy.hero.reassurance}
        </p>
        <PublicCtaButtons />
      </section>

      {/* What you can do */}
      <section aria-labelledby="home-features-heading" className="space-y-8">
        <h2
          id="home-features-heading"
          className="text-center text-2xl font-semibold tracking-[-0.01em] text-[var(--foreground)]"
        >
          {homeCopy.features.heading}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {homeCopy.features.cards.map((card, index) => (
            <div
              key={card.title}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-[11px] bg-[var(--lilac)] text-[var(--primary)]">
                {FEATURE_ICONS[index]}
              </div>
              <h3 className="text-base font-semibold tracking-[-0.01em] text-[var(--foreground)]">
                {card.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--fg-2)]">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy, in plain language */}
      <section
        aria-labelledby="home-privacy-heading"
        className="mx-auto max-w-2xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-6 py-8 shadow-[var(--shadow-sm)] md:px-10"
        role="region"
      >
        <h2
          id="home-privacy-heading"
          className="text-center text-2xl font-semibold tracking-[-0.01em] text-[var(--foreground)]"
        >
          {homeCopy.privacy.heading}
        </h2>
        <ul className="mt-6 space-y-3.5">
          {homeCopy.privacy.body.map((paragraph) => (
            <li key={paragraph} className="flex gap-3 text-[var(--fg-2)]">
              <svg className="mt-[3px] flex-none text-[var(--success)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="text-[14.5px] leading-relaxed">{paragraph}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Not in this MVP */}
      <section
        aria-labelledby="home-deferred-heading"
        className="mx-auto max-w-2xl rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--lilac-soft)] px-6 py-8 text-center md:px-10"
      >
        <span className="inline-flex items-center rounded-full border border-[var(--border-2)] bg-[var(--card)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--primary)]">
          {homeCopy.deferred.badge}
        </span>
        <h2
          id="home-deferred-heading"
          className="mt-3 text-2xl font-semibold tracking-[-0.01em] text-[var(--foreground)]"
        >
          {homeCopy.deferred.heading}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-[var(--fg-2)]">
          {homeCopy.deferred.body}
        </p>
      </section>

      {/* Why create an account */}
      <section aria-labelledby="home-account-heading" className="mx-auto max-w-2xl">
        <h2
          id="home-account-heading"
          className="text-center text-2xl font-semibold tracking-[-0.01em] text-[var(--foreground)]"
        >
          {homeCopy.account.heading}
        </h2>
        <ul className="mt-6 space-y-3.5">
          {homeCopy.account.body.map((paragraph) => (
            <li key={paragraph} className="flex gap-3 text-[var(--fg-2)]">
              <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]" aria-hidden="true" />
              <span className="text-[14.5px] leading-relaxed">{paragraph}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section
        aria-labelledby="home-final-cta-heading"
        className="mx-auto flex max-w-2xl flex-col items-center space-y-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center shadow-[var(--shadow-sm)] md:px-10"
      >
        <div className="space-y-3">
          <h2
            id="home-final-cta-heading"
            className="text-2xl font-semibold tracking-[-0.01em] text-[var(--foreground)]"
          >
            {homeCopy.finalCta.heading}
          </h2>
          <p className="mx-auto max-w-md leading-relaxed text-[var(--fg-2)]">
            {homeCopy.finalCta.subtitle}
          </p>
        </div>
        <PublicCtaButtons />
      </section>
    </PageLayout>
  );
}
