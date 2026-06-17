import { PublicCtaButtons } from "@/components/marketing/public-cta-buttons";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { homeCopy } from "@/lib/marketing/home-copy";

export default function HomePage() {
  return (
    <PageLayout width="marketing" className="space-y-16 md:space-y-20">
      <section aria-labelledby="home-hero-heading" className="mx-auto max-w-2xl space-y-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--accent)]">
          {homeCopy.hero.eyebrow}
        </p>
        <div className="space-y-4">
          <h1
            id="home-hero-heading"
            className="text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {homeCopy.hero.title}
          </h1>
          <p className="text-lg leading-relaxed text-[var(--muted)]">{homeCopy.hero.subtitle}</p>
        </div>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{homeCopy.hero.reassurance}</p>
        <PublicCtaButtons />
      </section>

      <section aria-labelledby="home-features-heading" className="space-y-6">
        <h2
          id="home-features-heading"
          className="text-center text-2xl font-semibold tracking-tight text-[var(--foreground)]"
        >
          {homeCopy.features.heading}
        </h2>
        <div className="grid gap-4 text-left sm:grid-cols-2">
          {homeCopy.features.cards.map((card) => (
            <Card key={card.title} muted>
              <CardHeader>
                <CardTitle className="text-base">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="home-privacy-heading"
        className="mx-auto max-w-2xl space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-6 py-8 text-center shadow-[var(--shadow-sm)] md:px-10"
        role="region"
      >
        <h2
          id="home-privacy-heading"
          className="text-2xl font-semibold tracking-tight text-[var(--foreground)]"
        >
          {homeCopy.privacy.heading}
        </h2>
        <div className="space-y-3 text-left text-[var(--muted)]">
          {homeCopy.privacy.body.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="home-deferred-heading"
        className="mx-auto max-w-2xl space-y-4 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--card-muted)] px-6 py-8 text-center md:px-10"
      >
        <div className="flex flex-col items-center gap-3">
          <Badge variant="muted">{homeCopy.deferred.badge}</Badge>
          <h2
            id="home-deferred-heading"
            className="text-2xl font-semibold tracking-tight text-[var(--foreground)]"
          >
            {homeCopy.deferred.heading}
          </h2>
        </div>
        <p className="text-left leading-relaxed text-[var(--muted)]">{homeCopy.deferred.body}</p>
      </section>

      <section
        aria-labelledby="home-account-heading"
        className="mx-auto max-w-2xl space-y-4 text-center"
      >
        <h2
          id="home-account-heading"
          className="text-2xl font-semibold tracking-tight text-[var(--foreground)]"
        >
          {homeCopy.account.heading}
        </h2>
        <ul className="space-y-3 text-left text-[var(--muted)]">
          {homeCopy.account.body.map((paragraph) => (
            <li key={paragraph} className="leading-relaxed">
              {paragraph}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="home-final-cta-heading"
        className="mx-auto max-w-2xl space-y-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center shadow-[var(--shadow-sm)] md:px-10"
      >
        <div className="space-y-3">
          <h2
            id="home-final-cta-heading"
            className="text-2xl font-semibold tracking-tight text-[var(--foreground)]"
          >
            {homeCopy.finalCta.heading}
          </h2>
          <p className="leading-relaxed text-[var(--muted)]">{homeCopy.finalCta.subtitle}</p>
        </div>
        <PublicCtaButtons />
      </section>
    </PageLayout>
  );
}
