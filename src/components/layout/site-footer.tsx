const SECURE_AUTH_ATTRIBUTION_URL =
  "https://github.com/tgoliveira11/next-secure-auth-starter";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--foreground)]">
          <span className="font-medium text-[var(--primary)]">Letters to God</span>
          <span className="text-[var(--muted)]"> · © {year}</span>
        </p>
        <p>
          <a
            href={SECURE_AUTH_ATTRIBUTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[var(--radius)] font-medium text-[var(--primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Powered by @tgoliveira/secure-auth
          </a>
        </p>
      </div>
    </footer>
  );
}

export { SECURE_AUTH_ATTRIBUTION_URL };
