/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import LoginPage from "@/app/(auth)/login/page";
import { testSecureAuthUiConfig } from "@/test/helpers/secure-auth-ui-config";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@tgoliveira/secure-auth/react/client", () => ({
  signInWithPasskey: vi.fn(),
  isPasskeyLoginSupported: vi.fn(() => false),
  getPasskeyLoginUnsupportedMessage: () => "This browser does not support passkey sign-in.",
}));

function renderLoginPage() {
  return render(
    <SecureAuthUIProvider config={testSecureAuthUiConfig}>
      <LoginPage />
    </SecureAuthUIProvider>
  );
}

describe("login page (package UI)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the package credentials sign-in form", async () => {
    renderLoginPage();
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in with email/i })).toBeTruthy();
    expect(screen.getByText(/protected on this device/i)).toBeTruthy();
  });

  it("posts credentials to the package start-form API route", async () => {
    renderLoginPage();
    const form = document.getElementById("login-credentials-form");
    expect(form).toBeTruthy();
    expect(form?.getAttribute("action")).toBe("/api/auth/login/start-form");
    expect(form?.getAttribute("method")).toBe("post");
  });
});
