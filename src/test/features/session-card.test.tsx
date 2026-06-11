/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionCard } from "@/components/settings/session-card";

const baseSession = {
  id: "session-1",
  isCurrent: false,
  authMethod: "password" as const,
  browser: "unknown",
  platform: "unknown",
  deviceType: "unknown",
  ipMasked: "partially hidden",
  createdAt: "2026-01-01T10:00:00.000Z",
  lastUsedAt: "2026-01-02T12:00:00.000Z",
  expiresAt: "2026-02-01T10:00:00.000Z",
};

describe("SessionCard", () => {
  it("renders unknown browser fallback and device type", () => {
    render(<SessionCard session={baseSession} onRevoke={vi.fn()} />);
    expect(screen.getByText("Unknown browser")).toBeTruthy();
    expect(screen.getByText("Unknown device")).toBeTruthy();
  });

  it("hides revoke button for current session", () => {
    render(
      <SessionCard
        session={{ ...baseSession, isCurrent: true, browser: "Chrome", platform: "macOS" }}
        onRevoke={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    expect(screen.getByText("This session")).toBeTruthy();
  });
});
