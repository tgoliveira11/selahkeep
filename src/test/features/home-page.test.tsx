/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/(public)/page";
import { SiteShell } from "@/components/layout/site-shell";
import {
  SECURE_AUTH_ATTRIBUTION_URL,
  SiteFooter,
} from "@/components/layout/site-footer";
import { homeCopy } from "@/lib/marketing/home-copy";

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

function renderHomeInShell() {
  return render(
    <SiteShell>
      <HomePage />
    </SiteShell>
  );
}

describe("home page marketing content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the hero title", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: homeCopy.hero.title })).toBeTruthy();
  });

  it("explains private letters in the hero reassurance", () => {
    render(<HomePage />);
    expect(screen.getByText(homeCopy.hero.reassurance)).toBeTruthy();
  });

  it("explains writing and keeping letters", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /write privately/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /keep your letters/i })).toBeTruthy();
    expect(screen.getByText(/compose personal letters/i)).toBeTruthy();
    expect(screen.getByText(/save your letters securely/i)).toBeTruthy();
  });

  it("explains marking letters as answered", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /mark as answered/i })).toBeTruthy();
    expect(screen.getByText(/prayer or letter feels answered/i)).toBeTruthy();
  });

  it("explains recovery options", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /recover thoughtfully/i })).toBeTruthy();
    expect(screen.getByText(/recovery code or trusted device/i)).toBeTruthy();
  });

  it("does not claim community is live", () => {
    render(<HomePage />);
    expect(screen.getByText(/not available yet/i)).toBeTruthy();
    expect(screen.getByText(/not live today/i)).toBeTruthy();
    expect(screen.queryByText(/join our community/i)).toBeNull();
  });

  it("has create account and sign in CTAs", () => {
    render(<HomePage />);
    const createLinks = screen.getAllByRole("link", { name: /create account/i });
    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(createLinks.some((link) => link.getAttribute("href") === "/register")).toBe(true);
    expect(signInLinks.some((link) => link.getAttribute("href") === "/login")).toBe(true);
    expect(createLinks.length).toBeGreaterThanOrEqual(2);
    expect(signInLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("avoids crypto jargon in the privacy section", () => {
    render(<HomePage />);
    const privacySection = screen.getByRole("region", { name: homeCopy.privacy.heading });
    const text = privacySection.textContent ?? "";
    expect(text).not.toMatch(/PRF|envelope encryption|vault key|IndexedDB/i);
  });
});

describe("home page shared layout", () => {
  it("renders header navigation", () => {
    renderHomeInShell();
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("link", { name: /letters to god/i })).toBeTruthy();
  });

  it("renders footer secure-auth attribution with safe external link", () => {
    render(<SiteFooter />);
    const link = screen.getByRole("link", { name: /powered by @tgoliveira\/secure-auth/i });
    expect(link.getAttribute("href")).toBe(SECURE_AUTH_ATTRIBUTION_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("uses shared site shell on the home page", () => {
    renderHomeInShell();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
  });
});
