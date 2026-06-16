/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import HomePage from "@/app/(public)/page";
import LoginPage from "@/app/(auth)/login/page";
import { SiteShell } from "@/components/layout/site-shell";
import {
  SECURE_AUTH_ATTRIBUTION_URL,
  SiteFooter,
} from "@/components/layout/site-footer";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import { testSecureAuthUiConfig } from "@/test/helpers/secure-auth-ui-config";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@tgoliveira/secure-auth/react/client", () => ({
  signInWithPasskey: vi.fn(),
  isPasskeyLoginSupported: vi.fn(() => false),
  getPasskeyLoginUnsupportedMessage: () => "This browser does not support passkey sign-in.",
}));

vi.mock("@/features/vault/use-vault-session-unlocked", () => ({
  useVaultSessionUnlocked: vi.fn(() => false),
}));

function withSecureAuthUi(children: React.ReactNode) {
  return <SecureAuthUIProvider config={testSecureAuthUiConfig}>{children}</SecureAuthUIProvider>;
}

describe("site layout shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header navigation on the public home page", () => {
    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    const header = screen.getByRole("banner");
    expect(header).toBeTruthy();
    expect(screen.getByRole("link", { name: /letters to god/i })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
  });

  it("renders footer on the public home page", () => {
    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeTruthy();
    expect(footer.textContent).toMatch(/letters to god/i);
  });

  it("footer includes secure-auth attribution with safe external link", () => {
    render(<SiteFooter />);

    const link = screen.getByRole("link", { name: /powered by @tgoliveira\/secure-auth/i });
    expect(link.getAttribute("href")).toBe(SECURE_AUTH_ATTRIBUTION_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("auth package login page still renders inside site shell", () => {
    render(
      <SiteShell>
        {withSecureAuthUi(<LoginPage />)}
      </SiteShell>
    );

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("mobile menu button has an accessible label when signed in", async () => {
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      status: "authenticated",
      update: vi.fn(),
    });

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.getByRole("button", { name: /open menu/i })).toBeTruthy();
  });

  it("package.json does not define removed E2E scripts", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };

    expect(pkg.scripts?.["test:e2e"]).toBeUndefined();
    expect(pkg.scripts?.["test:e2e:ui"]).toBeUndefined();
    expect(pkg.scripts?.["test:all"]).toBe("npm run test:coverage");
  });
});
