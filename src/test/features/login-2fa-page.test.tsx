/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginTwoFactorPage from "@/app/(auth)/login/2fa/page";

const CHALLENGE_STORAGE_KEY = "letters-2fa-login-challenge";

const replace = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace, back: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams("mode=credentials")),
  usePathname: vi.fn(() => "/login/2fa"),
}));

describe("login 2FA page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows the authenticator form when a credentials challenge exists", async () => {
    sessionStorage.setItem(CHALLENGE_STORAGE_KEY, "challenge-token-1234567890");
    render(<LoginTwoFactorPage />);
    expect(
      await screen.findByRole("heading", { name: /two-factor authentication/i })
    ).toBeTruthy();
    expect(screen.getByLabelText("Authenticator code")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to login when the credentials challenge is missing", async () => {
    render(<LoginTwoFactorPage />);
    expect(
      await screen.findByRole("heading", { name: /two-factor authentication/i })
    ).toBeTruthy();
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
