/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountSettingsPage from "@/app/(vault)/settings/account/page";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    status: "authenticated",
    data: { user: { id: "user-1", email: "user@test.local" } },
  })),
}));

vi.mock("@tgoliveira/secure-auth/react/client", () => ({
  defaultSignOutAccount: vi.fn(async () => undefined),
}));

vi.mock("@tgoliveira/secure-auth/react", () => ({
  AccountSettingsPage: ({ footer }: { footer?: React.ReactNode }) => (
    <div>
      <h1>Account settings</h1>
      <button type="button">Delete my account permanently</button>
      {footer}
    </div>
  ),
}));

vi.mock("@/lib/crypto-client/vault", () => ({
  clearVaultClientState: vi.fn(async () => undefined),
}));

describe("account settings page wrapper", () => {
  it("renders package account settings with product recovery links", () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole("heading", { name: /account settings/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /trusted devices/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /recovery code/i })).toBeTruthy();
  });
});
