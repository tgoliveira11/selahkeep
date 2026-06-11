/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

vi.mock("@/components/layout/page-layout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/api-client/account-auth", () => ({
  accountAuthApi: {
    forgotPassword: vi.fn(async () => ({
      message: "If an account exists for this email, we'll send password reset instructions.",
    })),
  },
}));

describe("forgot password page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows generic success after submit", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset instructions" }));
    await waitFor(() => {
      expect(screen.getByText(/If an account exists/i)).toBeTruthy();
    });
  });
});
