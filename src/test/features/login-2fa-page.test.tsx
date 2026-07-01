import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import LoginTwoFactorPage from "@/app/(auth)/login/2fa/page";
import { testSecureAuthUiConfig } from "@/test/helpers/secure-auth-ui-config";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated", update: vi.fn() })),
  signIn: vi.fn(),
  getSession: vi.fn(),
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

describe("login 2FA page (app integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the credentials 2FA form when mode=credentials", async () => {
    renderTwoFactorPage();
    expect(
      await screen.findByRole("heading", { name: /two-factor verification/i })
    ).toBeTruthy();
    expect(screen.getByLabelText("Authenticator code")).toBeTruthy();
    expect(screen.getByRole("button", { name: /verify and continue/i })).toBeTruthy();
  });

  it("posts the TOTP form to the 2FA page route", async () => {
    renderTwoFactorPage();
    await screen.findByRole("heading", { name: /two-factor verification/i });
    const form = screen.getByLabelText("Authenticator code").closest("form");
    expect(form?.getAttribute("action")).toBe("/login/2fa");
    expect(form?.getAttribute("method")).toBe("post");
  });

  it("uses sanitized callbackUrl from search params for oauth mode", async () => {
    const { useSearchParams } = await import("next/navigation");
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        "mode=oauth&callbackUrl=%2Fvault%2Fsettings"
      ) as ReturnType<typeof useSearchParams>
    );

    renderTwoFactorPage();
    await screen.findByRole("heading", { name: /two-factor verification/i });
    expect(screen.getByRole("button", { name: /verify and continue/i })).toBeTruthy();
  });

  it("rejects unsafe callbackUrl values", async () => {
    const { useSearchParams } = await import("next/navigation");
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        "mode=oauth&callbackUrl=https%3A%2F%2Fevil.test"
      ) as ReturnType<typeof useSearchParams>
    );

    renderTwoFactorPage();
    await screen.findByRole("heading", { name: /two-factor verification/i });
    expect(screen.getByRole("button", { name: /verify and continue/i })).toBeTruthy();
  });
});
