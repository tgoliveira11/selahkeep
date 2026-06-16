/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import LoginTwoFactorPage from "@/app/(auth)/login/2fa/page";
import { testSecureAuthUiConfig } from "@/test/helpers/secure-auth-ui-config";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated", update: vi.fn() })),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams("mode=credentials")),
  usePathname: vi.fn(() => "/login/2fa"),
}));

function renderTwoFactorPage() {
  return render(
    <SecureAuthUIProvider config={testSecureAuthUiConfig}>
      <LoginTwoFactorPage />
    </SecureAuthUIProvider>
  );
}

describe("login 2FA page (package UI)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the credentials 2FA form when mode=credentials", async () => {
    renderTwoFactorPage();
    expect(
      await screen.findByRole("heading", { name: /two-factor authentication/i })
    ).toBeTruthy();
    expect(screen.getByLabelText("Authenticator code")).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue/i })).toBeTruthy();
  });

  it("posts the TOTP form to the 2FA page route", async () => {
    renderTwoFactorPage();
    await screen.findByRole("heading", { name: /two-factor authentication/i });
    const form = screen.getByLabelText("Authenticator code").closest("form");
    expect(form?.getAttribute("action")).toBe("/api/auth/login/verify-2fa-form");
    expect(form?.getAttribute("method")).toBe("post");
  });
});
