/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountSettingsPage from "@/app/(vault)/settings/account/page";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    status: "authenticated",
    data: { user: { id: "user-1", email: "user@test.local" } },
  })),
  signOut: vi.fn(async () => undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
}));

vi.mock("@/components/layout/nav", () => ({
  Nav: () => <div>Nav</div>,
}));

vi.mock("@/lib/api-client/account", () => ({
  accountApi: {
    getDeletionRequirements: vi.fn(async () => ({
      requiresPassword: true,
      authProvider: "credentials",
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    })),
    deleteAccount: vi.fn(async () => ({ success: true })),
  },
}));

vi.mock("@/lib/crypto-client/vault", () => ({
  clearVaultClientState: vi.fn(async () => undefined),
}));

describe("account deletion page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders account deletion UI", async () => {
    render(<AccountSettingsPage />);
    expect(await screen.findByText("Delete account")).toBeTruthy();
    expect(screen.getByText(/permanently removes your account/i)).toBeTruthy();
  });

  it("keeps delete button disabled until confirmation phrase matches", async () => {
    render(<AccountSettingsPage />);
    const button = (await screen.findByRole("button", {
      name: /delete my account permanently/i,
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/re-enter your password/i), {
      target: { value: "secret" },
    });
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/DELETE MY ACCOUNT/i), {
      target: { value: ACCOUNT_DELETION_CONFIRMATION_PHRASE },
    });
    expect(button.disabled).toBe(false);
  });
});
