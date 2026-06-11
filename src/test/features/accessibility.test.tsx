/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import HomePage from "@/app/page";
import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import AccountDeletedPage from "@/app/(public)/account-deleted/page";
import { SkipLink } from "@/components/layout/skip-link";
import { MAIN_CONTENT_ID } from "@/lib/ui/main-content";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/"),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

describe("accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("landing page has no obvious axe violations", async () => {
    const { container } = render(<HomePage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("login page has no obvious axe violations", async () => {
    const { container } = render(<LoginPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("register page has no obvious axe violations", async () => {
    const { container } = render(<RegisterPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("account deleted page has no obvious axe violations", async () => {
    const { container } = render(<AccountDeletedPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders a skip link targeting main content", () => {
    render(<SkipLink />);
    const link = document.querySelector(".skip-link");
    expect(link?.getAttribute("href")).toBe(`#${MAIN_CONTENT_ID}`);
    expect(link?.textContent).toMatch(/skip to content/i);
  });
});
