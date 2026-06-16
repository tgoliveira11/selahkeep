/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import HomePage from "@/app/(public)/page";
import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import AccountDeletedPage from "@/app/(public)/account-deleted/page";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { getRecoveryStateLabel } from "@/lib/ui/recovery-state-labels";
import { testSecureAuthUiConfig } from "@/test/helpers/secure-auth-ui-config";
import { authPageMessages } from "@/lib/auth/auth-page-messages";

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

function withSecureAuthUi(children: React.ReactNode) {
  return <SecureAuthUIProvider config={testSecureAuthUiConfig}>{children}</SecureAuthUIProvider>;
}

describe("UI pages and components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders landing page with create account CTA", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /letters to god/i })).toBeTruthy();
    const createLinks = screen.getAllByRole("link", { name: /create account/i });
    expect(createLinks.some((link) => link.getAttribute("href") === "/register")).toBe(true);
    expect(screen.getAllByText(/protected on your device/i).length).toBeGreaterThan(0);
  });

  it("renders login page with labeled fields", () => {
    render(withSecureAuthUi(<LoginPage />));
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("renders register page with social options", () => {
    render(withSecureAuthUi(<RegisterPage />));
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();
    expect(screen.getByText(authPageMessages.registerDescription)).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with apple/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with microsoft/i })).toBeTruthy();
  });

  it("renders account deleted page", () => {
    render(<AccountDeletedPage />);
    expect(screen.getByText(/your account has been deleted/i)).toBeTruthy();
  });

  it("renders letter list empty state", () => {
    render(
      <EmptyState
        title="No letters yet"
        description="Write your first private letter."
      />
    );
    expect(screen.getByText("No letters yet")).toBeTruthy();
  });

  it("renders accessible loading state", () => {
    render(<LoadingState label="Loading your letters" />);
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
  });

  it("maps recovery states to user-friendly labels", () => {
    expect(getRecoveryStateLabel("Protected").label).toBe("Well protected");
    expect(getRecoveryStateLabel("Basic").label).toBe("Basic protection");
    expect(getRecoveryStateLabel("At Risk").label).toMatch(/needs attention/i);
  });
});
