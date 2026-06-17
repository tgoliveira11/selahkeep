/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { SiteShell } from "@/components/layout/site-shell";
import HomePage from "@/app/(public)/page";
import {
  isLoggedInNavLinkActive,
  LOGGED_IN_NAV_LINKS,
} from "@/lib/navigation/logged-in-nav";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing/brand";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/notes"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/features/vault/use-vault-session-unlocked", () => ({
  useVaultSessionUnlocked: vi.fn(() => false),
}));

describe("logged-in navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defines Notes, Vault, and Account primary links without Letters", () => {
    const labels = LOGGED_IN_NAV_LINKS.map((link) => link.label);
    expect(labels).toContain("Notes");
    expect(labels).toContain("Vault");
    expect(labels).toContain("Account");
    expect(labels.some((label) => /letter/i.test(label))).toBe(false);
    expect(LOGGED_IN_NAV_LINKS.some((link) => link.href.includes("/letters"))).toBe(false);
  });

  it("marks Notes active for note detail and new routes", () => {
    expect(isLoggedInNavLinkActive("/notes", "/notes")).toBe(true);
    expect(isLoggedInNavLinkActive("/notes/new", "/notes")).toBe(true);
    expect(isLoggedInNavLinkActive("/notes/abc", "/notes")).toBe(true);
  });

  it("marks Vault active for vault unlock and setup routes", () => {
    expect(isLoggedInNavLinkActive("/vault/settings", "/vault/settings")).toBe(true);
    expect(isLoggedInNavLinkActive("/vault/unlock", "/vault/settings")).toBe(true);
    expect(isLoggedInNavLinkActive("/vault/setup", "/vault/settings")).toBe(true);
  });

  it("shows Notes and Account when signed in on desktop", async () => {
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

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Notes" })).toBeTruthy();
    expect(within(header).getByRole("link", { name: "Vault" })).toBeTruthy();
    expect(within(header).getByRole("link", { name: "Account" })).toBeTruthy();
    expect(within(header).queryByRole("link", { name: /letters/i })).toBeNull();
    expect(within(header).queryByRole("link", { name: /^write$/i })).toBeNull();
  });

  it("shows Unlock vault when signed in and vault is locked", async () => {
    const { useSession } = await import("next-auth/react");
    const { useVaultSessionUnlocked } = await import("@/features/vault/use-vault-session-unlocked");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(useVaultSessionUnlocked).mockReturnValue(false);

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.getByRole("link", { name: /unlock vault/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /lock vault/i })).toBeNull();
  });

  it("shows Lock vault when vault is unlocked", async () => {
    const { useSession } = await import("next-auth/react");
    const { useVaultSessionUnlocked } = await import("@/features/vault/use-vault-session-unlocked");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(useVaultSessionUnlocked).mockReturnValue(true);

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.getByRole("button", { name: /lock vault/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /unlock vault/i })).toBeNull();
  });

  it("mobile menu includes Notes, Vault, Account, and Sign out", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    expect(within(mobileNav).getByRole("link", { name: "Notes" })).toBeTruthy();
    expect(within(mobileNav).getByRole("link", { name: "Vault" })).toBeTruthy();
    expect(within(mobileNav).getByRole("link", { name: "Account" })).toBeTruthy();
    expect(within(mobileNav).getByRole("button", { name: /sign out/i })).toBeTruthy();
  });

  it("public navigation still offers sign in when signed out", async () => {
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Notes" })).toBeNull();
  });
});

describe("LTG Vault metadata and icon", () => {
  it("layout metadata uses LTG Vault title and tagline", async () => {
    const layout = await import("@/app/layout");
    expect(layout.metadata.title).toBe(PRODUCT_NAME);
    expect(layout.metadata.description).toBe(PRODUCT_TAGLINE);
  });

  it("favicon uses purple LTG monogram without green envelope colors", () => {
    const icon = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");
    expect(icon).toContain("#5b3a8c");
    expect(icon).toContain("LTG");
    expect(icon).not.toContain("#4a6741");
    expect(icon).not.toContain("M6 11.75");
  });

  it("AppMark primitive does not use legacy green envelope palette", () => {
    const source = readFileSync(
      join(process.cwd(), "src/modules/ui/primitives/app-mark.tsx"),
      "utf8"
    );
    expect(source).toContain("BRAND_MARK_SVG");
    expect(source).not.toContain("#4a6741");
  });
});
