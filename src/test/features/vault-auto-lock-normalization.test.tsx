import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VaultLockedState } from "@/features/vault/vault-locked-state";
import { NotesVaultProtectedMessage } from "@/features/notes/notes-vault-protected-message";
import { requestVaultDockExpand } from "@tgoliveira/vault-core/react";

vi.mock("@tgoliveira/vault-core/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/vault-core/react")>();
  return { ...actual, requestVaultDockExpand: vi.fn() };
});

const VARIANTS = [
  {
    variant: "notes-list" as const,
    title: "Your vault is locked",
    testId: "notes-vault-locked-state",
    returnTo: "/notes",
  },
  {
    variant: "write" as const,
    title: "Unlock to write",
    testId: "vault-locked-state-write",
    returnTo: "/notes/new",
  },
  {
    variant: "read-note" as const,
    title: "Unlock to read this note",
    testId: "vault-locked-state-read-note",
    returnTo: "/notes/abc",
  },
  {
    variant: "vault-settings" as const,
    title: "Unlock your vault to manage vault settings",
    testId: "vault-locked-state-vault-settings",
    returnTo: "/vault/settings",
  },
  {
    variant: "vault-security" as const,
    title: "Unlock your vault to run security checks",
    testId: "vault-locked-state-vault-security",
    returnTo: "/vault/security",
  },
];

describe("VaultLockedState normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(VARIANTS)("renders $variant title and actions", ({ variant, title, testId, returnTo }) => {
    render(<VaultLockedState variant={variant} returnTo={returnTo} />);

    expect(screen.getByTestId(testId)).toBeTruthy();
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByRole("button", { name: /unlock here/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /open full unlock page/i }).getAttribute("href")).toBe(
      `/vault/unlock?next=${encodeURIComponent(returnTo)}`
    );
  });

  it("write variant shows auto-lock copy when autoLocked", () => {
    render(<VaultLockedState variant="write" autoLocked returnTo="/notes/new" />);

    expect(screen.getByRole("heading", { name: /vault closed while writing/i })).toBeTruthy();
    expect(screen.getByText(/encrypted draft on this device/i)).toBeTruthy();
  });

  it("write variant shows initial locked copy when not autoLocked", () => {
    render(<VaultLockedState variant="write" returnTo="/notes/new" />);

    expect(screen.getByRole("heading", { name: /^unlock to write$/i })).toBeTruthy();
    expect(screen.queryByText(/vault closed while writing/i)).toBeNull();
  });

  it("notes-list variant shows the calm locked hero (no security bullets)", () => {
    render(<VaultLockedState variant="notes-list" returnTo="/notes" />);

    expect(screen.getByText(/encrypted and waiting/i)).toBeTruthy();
    expect(screen.queryByText(/account session does not unlock your vault/i)).toBeNull();
  });

  it("does not show recovery protection summary", () => {
    render(<VaultLockedState variant="write" returnTo="/notes/new" />);

    expect(screen.queryByText(/recovery protection/i)).toBeNull();
    expect(screen.queryByText(/recovery code/i)).toBeNull();
  });

  it("does not show recovery code in active copy", () => {
    render(<VaultLockedState variant="notes-list" returnTo="/notes" />);

    expect(screen.queryByText(/recovery code/i)).toBeNull();
  });

  it("Unlock here requests dock expand (desktop)", () => {
    render(<VaultLockedState variant="read-note" returnTo="/notes/1" />);

    fireEvent.click(screen.getByRole("button", { name: /unlock here/i }));
    expect(requestVaultDockExpand).toHaveBeenCalledTimes(1);
  });

  it("NotesVaultProtectedMessage delegates to notes-list variant", () => {
    render(<NotesVaultProtectedMessage />);

    expect(screen.getByTestId("notes-vault-locked-state")).toBeTruthy();
    expect(screen.getByRole("button", { name: /unlock here/i })).toBeTruthy();
  });

  it("settings and security variants omit security bullets", () => {
    render(<VaultLockedState variant="vault-settings" returnTo="/vault/settings" />);
    expect(screen.queryByText(/auto-locks after inactivity/i)).toBeNull();

    render(<VaultLockedState variant="vault-security" returnTo="/vault/security" />);
    expect(screen.queryByText(/auto-locks after inactivity/i)).toBeNull();
  });
});

describe("VaultLockedState copy guardrails", () => {
  it("never mentions Well protected", () => {
    for (const { variant } of VARIANTS) {
      const { unmount } = render(<VaultLockedState variant={variant} returnTo="/notes" />);
      expect(screen.queryByText(/well protected/i)).toBeNull();
      unmount();
    }
  });

  it("primary action label is Unlock here across variants", () => {
    for (const { variant } of VARIANTS) {
      const { unmount } = render(<VaultLockedState variant={variant} returnTo="/notes" />);
      expect(screen.getByRole("button", { name: /^unlock here$/i })).toBeTruthy();
      unmount();
    }
  });
});
