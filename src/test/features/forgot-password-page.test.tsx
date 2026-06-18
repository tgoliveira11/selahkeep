/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import { testSecureAuthUiConfig } from "@/test/helpers/secure-auth-ui-config";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated", update: vi.fn() })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    accountAuthApi: {
      forgotPassword: vi.fn(async () => ({
        message: "If an account exists for this email, we'll send password reset instructions.",
      })),
    },
  };
});

describe("forgot password page (package UI)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows generic success after submit", async () => {
    render(
      <SecureAuthUIProvider config={testSecureAuthUiConfig}>
        <ForgotPasswordPage />
      </SecureAuthUIProvider>
    );
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset instructions/i }));
    await waitFor(() => {
      expect(screen.getByText(/If an account exists/i)).toBeTruthy();
    });
  });
});
