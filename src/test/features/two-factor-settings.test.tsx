// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  startSetup: vi.fn(),
  verifySetup: vi.fn(),
}));

vi.mock("@/lib/api-client/two-factor", () => ({
  twoFactorApi: {
    status: mocks.status,
    startSetup: mocks.startSetup,
    verifySetup: mocks.verifySetup,
    disable: vi.fn(),
  },
}));

describe("two-factor settings UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.status.mockResolvedValue({ enabled: false, enabledAt: null, hasPendingSetup: false });
  });

  it("shows off status and setup action", async () => {
    render(<TwoFactorSettings />);
    await waitFor(() => {
      expect(screen.getByText("Off")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /set up two-factor authentication/i })).toBeTruthy();
    expect(screen.getByText(/does not replace your private letter recovery code/i)).toBeTruthy();
  });

  it("renders setup QR and code input", async () => {
    mocks.startSetup.mockResolvedValue({
      qrCodeDataUrl: "data:image/png;base64,abc",
      manualSetupKey: "SECRETKEY",
      issuer: "Letters to God",
      accountLabel: "user@example.com",
    });

    render(<TwoFactorSettings />);
    await waitFor(() => screen.getByRole("button", { name: /set up two-factor authentication/i }));
    fireEvent.click(screen.getByRole("button", { name: /set up two-factor authentication/i }));

    await waitFor(() => {
      expect(screen.getByAltText(/qr code for authenticator app setup/i)).toBeTruthy();
      expect(screen.getByText("SECRETKEY")).toBeTruthy();
    });
  });
});
