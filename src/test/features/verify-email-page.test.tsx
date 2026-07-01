import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";
import { testSecureAuthUiConfig } from "@/test/helpers/secure-auth-ui-config";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated", update: vi.fn() })),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=abc"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    accountAuthApi: {
      confirmVerification: vi.fn(async () => ({ verified: true, email: "user@example.com" })),
    },
  };
});

describe("verify email page (package UI)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows success state", async () => {
    render(
      <SecureAuthUIProvider config={testSecureAuthUiConfig}>
        <VerifyEmailPage />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/your email has been verified/i)).toBeTruthy();
    });
  });
});
