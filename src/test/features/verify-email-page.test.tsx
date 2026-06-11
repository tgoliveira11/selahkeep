/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";

vi.mock("@/components/layout/page-layout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=abc"),
}));

vi.mock("@/lib/api-client/account-auth", () => ({
  accountAuthApi: {
    confirmVerification: vi.fn(async () => ({ verified: true, email: "user@example.com" })),
  },
}));

describe("verify email page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows success state", async () => {
    render(<VerifyEmailPage />);
    await waitFor(() => {
      expect(screen.getByText(/Your email has been verified/i)).toBeTruthy();
    });
  });
});
