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
  SecuritySettingsPage: () => (
    <section id="security">
      <h2>Security settings</h2>
      <h3>Passkeys</h3>
      <h3>Two-factor authentication</h3>
    </section>
  ),
}));

vi.mock("@/lib/crypto-client/vault", () => ({
  clearVaultClientState: vi.fn(async () => undefined),
  isVaultUnlocked: vi.fn(() => false),
}));

vi.mock("@/features/passkey/passkey-vault-unlock-setup", () => ({
  PasskeyVaultUnlockSetup: () => <div>Passkey vault unlock setup</div>,
}));

describe("account settings page wrapper", () => {
  it("renders package account settings with security and product recovery links", () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole("heading", { name: /account settings/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /security settings/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /passkeys/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /two-factor authentication/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /security settings/i })).toBeNull();
    expect(screen.getByRole("link", { name: /trusted devices/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /recovery code/i })).toBeTruthy();
  });
});
