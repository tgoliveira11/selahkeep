import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyNotice } from "@/components/ui/privacy-notice";

export default function HomePage() {
  return (
    <PageLayout width="wide" className="max-w-3xl text-center">
      <div className="mx-auto max-w-2xl space-y-8 py-8 md:py-16">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--accent)]">
            A quiet place for private letters
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
            Letters to God
          </h1>
          <p className="text-lg leading-relaxed text-[var(--muted)]">
            Write personal letters in a space that feels calm and private. Your words are protected on
            your device before they are saved.
          </p>
        </div>

        <PrivacyNotice />

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link href="/register" className="sm:min-w-[160px]">
            <Button className="w-full">Create account</Button>
          </Link>
          <Link href="/login" className="sm:min-w-[160px]">
            <Button variant="secondary" className="w-full">
              Sign in
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 text-left sm:grid-cols-3">
          <Card muted>
            <CardHeader>
              <CardTitle className="text-base">Private by design</CardTitle>
              <CardDescription>
                Your letters are protected on your device. Our team cannot read them.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card muted>
            <CardHeader>
              <CardTitle className="text-base">Write peacefully</CardTitle>
              <CardDescription>
                A simple editor for thoughtful letters — without social feeds or distractions.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card muted>
            <CardHeader>
              <CardTitle className="text-base">Recover thoughtfully</CardTitle>
              <CardDescription>
                Save a recovery code or trusted device so you can access your letters on a new browser.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
