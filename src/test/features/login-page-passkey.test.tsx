/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  signIn: vi.fn(),
  signOutAccount: vi.fn(async () => undefined),
  authLoginStart: vi.fn(),
  signInWithPasskey: vi.fn(),
  isPasskeyLoginSupported: vi.fn(),
  getPasskeyLoginHint: vi.fn(() => null),
}));

const CHALLENGE_STORAGE_KEY = "letters-2fa-login-challenge";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("@/lib/auth/sign-out-client", () => ({
  signOutAccount: mocks.signOutAccount,
}));

vi.mock("@/lib/api-client/two-factor", () => ({
  authLoginApi: { start: mocks.authLoginStart },
}));

vi.mock("@/features/passkey/sign-in-with-passkey", () => ({
  signInWithPasskey: mocks.signInWithPasskey,
  isPasskeyLoginSupported: mocks.isPasskeyLoginSupported,
  getPasskeyLoginUnsupportedMessage: () => "This browser does not support passkey sign-in.",
}));

vi.mock("@/lib/passkey/login-hint", () => ({
  getPasskeyLoginHint: mocks.getPasskeyLoginHint,
}));

vi.mock("@/components/auth/social-sign-in", () => ({
  SocialSignIn: () => <div>Social sign-in</div>,
}));

describe("login page credentials sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.isPasskeyLoginSupported.mockReturnValue(true);
    mocks.getPasskeyLoginHint.mockReturnValue(null);
  });

  it("stores the challenge and routes to 2FA when required", async () => {
    mocks.authLoginStart.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "challenge-token-1234567890",
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));
    await waitFor(() => {
      expect(sessionStorage.getItem(CHALLENGE_STORAGE_KEY)).toBe("challenge-token-1234567890");
      expect(mocks.signOutAccount).toHaveBeenCalled();
      expect(mocks.push).toHaveBeenCalledWith("/login/2fa?mode=credentials");
    });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("completes sign-in without 2FA when disabled", async () => {
    mocks.authLoginStart.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "login-token-1234567890",
    });
    mocks.signIn.mockResolvedValue({ ok: true });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));
    await waitFor(() => {
      expect(mocks.signIn).toHaveBeenCalledWith("login-token", {
        loginToken: "login-token-1234567890",
        redirect: false,
      });
      expect(mocks.push).toHaveBeenCalledWith("/letters");
    });
  });
});

describe("login page passkey sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPasskeyLoginSupported.mockReturnValue(true);
    mocks.getPasskeyLoginHint.mockReturnValue(null);
  });

  it("shows passkey sign-in option", async () => {
    render(<LoginPage />);
    expect(await screen.findByRole("button", { name: "Sign in with passkey" })).toBeTruthy();
  });

  it("routes to letters when passkey unlock succeeds", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      credentialId: "cred-id",
    });
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "vault-unlocked",
      redirectTo: "/letters",
    });
    render(<LoginPage />);
    const button = await screen.findByRole("button", { name: "Sign in with passkey" });
    fireEvent.click(button);
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/letters");
    });
  });

  it("routes to vault unlock when passkey signs in without vault unlock", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      credentialId: "cred-id",
    });
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "vault-locked",
      redirectTo: "/vault/unlock",
    });
    render(<LoginPage />);
    const button = await screen.findByRole("button", { name: "Sign in with passkey" });
    fireEvent.click(button);
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/vault/unlock");
    });
  });

  it("requires email when no saved passkey hint exists", async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with passkey" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Enter your email");
    });
    expect(mocks.signInWithPasskey).not.toHaveBeenCalled();
  });

  it("passes entered email to passkey sign-in", async () => {
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "vault-unlocked",
      redirectTo: "/letters",
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: " user@example.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with passkey" }));
    await waitFor(() => {
      expect(mocks.signInWithPasskey).toHaveBeenCalledWith({ email: "user@example.com" });
    });
  });

  it("shows cancellation message", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      credentialId: "cred-id",
    });
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "cancelled",
      redirectTo: "/login",
    });
    render(<LoginPage />);
    const button = await screen.findByRole("button", { name: "Sign in with passkey" });
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Passkey sign-in was cancelled.");
    });
  });
});
