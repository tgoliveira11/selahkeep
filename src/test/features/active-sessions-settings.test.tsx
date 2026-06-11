/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActiveSessionsSettings } from "@/components/settings/active-sessions-settings";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  ping: vi.fn(),
  revoke: vi.fn(),
  revokeOthers: vi.fn(),
  revokeAll: vi.fn(),
  signOutAccount: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/api-client/account-sessions", () => ({
  accountSessionsApi: {
    list: mocks.list,
    ping: mocks.ping,
    revoke: mocks.revoke,
    revokeOthers: mocks.revokeOthers,
    revokeAll: mocks.revokeAll,
  },
}));

vi.mock("@/lib/auth/sign-out-client", () => ({
  signOutAccount: mocks.signOutAccount,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

const sessions = [
  {
    id: "current",
    isCurrent: true,
    authMethod: "passkey" as const,
    browser: "Chrome",
    platform: "macOS",
    deviceType: "desktop",
    ipMasked: "187.45.xxx.xxx",
    createdAt: "2026-01-01T10:00:00.000Z",
    lastUsedAt: new Date().toISOString(),
    expiresAt: "2026-02-01T10:00:00.000Z",
  },
  {
    id: "other",
    isCurrent: false,
    authMethod: "password" as const,
    browser: "Safari",
    platform: "iOS",
    deviceType: "mobile",
    ipMasked: "10.0.xxx.xxx",
    createdAt: "2026-01-01T10:00:00.000Z",
    lastUsedAt: new Date().toISOString(),
    expiresAt: "2026-02-01T10:00:00.000Z",
  },
];

describe("ActiveSessionsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ping.mockResolvedValue({ ok: true });
    mocks.list.mockResolvedValue({ sessions });
    mocks.revoke.mockResolvedValue({ revoked: true, signOut: false });
    mocks.revokeOthers.mockResolvedValue({ revokedCount: 1 });
    mocks.signOutAccount.mockResolvedValue(undefined);
  });

  it("shows current session badge and metadata", async () => {
    render(<ActiveSessionsSettings />);
    await waitFor(() => {
      expect(screen.getByText("This session")).toBeTruthy();
    });
    expect(screen.getByText(/Chrome on macOS/)).toBeTruthy();
    expect(screen.getByText(/Signed in with Passkey/)).toBeTruthy();
    expect(screen.getByText(/IP: 187\.45\.xxx\.xxx/)).toBeTruthy();
  });

  it("shows revoke confirmation for another session", async () => {
    render(<ActiveSessionsSettings />);
    await waitFor(() => expect(screen.getByText("Safari on iOS")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByText("Sign out this session?")).toBeTruthy();
  });

  it("revokes another session and shows success", async () => {
    render(<ActiveSessionsSettings />);
    await waitFor(() => expect(screen.getByText("Safari on iOS")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out session" }));
    await waitFor(() => {
      expect(screen.getByText("Session revoked.")).toBeTruthy();
    });
    expect(mocks.revoke).toHaveBeenCalledWith("other");
  });

  it("shows empty state when no sessions are returned", async () => {
    mocks.list.mockResolvedValue({ sessions: [] });
    render(<ActiveSessionsSettings />);
    await waitFor(() => {
      expect(screen.getByText("No active sessions were found.")).toBeTruthy();
    });
  });

  it("revokes all other sessions and shows success", async () => {
    render(<ActiveSessionsSettings />);
    await waitFor(() => expect(screen.getByText("Sign out of all other sessions")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Sign out of all other sessions" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out others" }));
    await waitFor(() => {
      expect(screen.getByText("All other sessions have been signed out.")).toBeTruthy();
    });
  });

  it("shows revoke all others confirmation", async () => {
    render(<ActiveSessionsSettings />);
    await waitFor(() => expect(screen.getByText("Sign out of all other sessions")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Sign out of all other sessions" }));
    expect(screen.getByText("Sign out of all other sessions?")).toBeTruthy();
  });
});
