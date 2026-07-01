import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VaultSecurityReview } from "@/features/vault/vault-security-review";
import { vaultApi } from "@/lib/api-client/vault";
import { verifyRecoveryPhraseDrill } from "@/lib/crypto-client/recovery-drill";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";

const mocks = vi.hoisted(() => ({
  probeEnvironment: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("@/lib/api-client/vault", () => ({
  vaultApi: {
    listSecurityEvents: vi.fn(),
    unlockEnvelope: vi.fn(),
  },
}));

vi.mock("@/lib/crypto-client/recovery-drill", () => ({
  verifyRecoveryPhraseDrill: vi.fn(),
}));

vi.mock("@/lib/crypto-client/vault", () => ({
  isVaultUnlocked: vi.fn(() => true),
}));

vi.mock("@/lib/crypto-client/recovery-phrase", () => ({
  validateRecoveryPhraseFormat: vi.fn(() => true),
}));

vi.mock("@/features/vault/record-vault-security-event", () => ({
  recordVaultSecurityEvent: mocks.recordEvent,
}));

vi.mock("@/lib/passkey/passkey-prf-diagnostics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/passkey/passkey-prf-diagnostics")>();
  return {
    ...actual,
    probePasskeyPrfEnvironmentAsync: mocks.probeEnvironment,
  };
});

const serverStatus = {
  initialized: true,
  hasVault: true,
  setupPhase: "complete" as const,
  setupComplete: true,
  hasVaultPassword: true,
  hasRecoveryPhrase: true,
  hasPasskey: false,
  availableUnlockMethods: { password: true, recoveryPhrase: true, passkey: false },
  recoveryPhrase: {
    createdAt: "2026-01-15T10:00:00.000Z",
    phraseLength: 12,
  },
};

describe("VaultSecurityReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vaultApi.listSecurityEvents).mockResolvedValue({
      events: [
        {
          id: "evt-1",
          eventType: "vault_unlocked",
          label: "Vault unlocked with vault password",
          createdAt: "2026-06-16T14:32:00.000Z",
        },
      ],
    });
    mocks.probeEnvironment.mockResolvedValue({
      userAgent: "test",
      secureContext: true,
      webauthnAvailable: true,
      credentialsApiAvailable: true,
      clientCapabilitiesAvailable: false,
      clientCapabilitiesPrf: null,
      capabilityProbe: "unsupported",
    });
  });

  it("renders vault health summary indicators", async () => {
    render(<VaultSecurityReview serverStatus={serverStatus} />);

    expect(await screen.findByText("Vault health summary")).toBeTruthy();
    expect(screen.getAllByText("Protection").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Recovery").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Passkey vault unlock").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Auto-lock").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not available yet/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not tracked yet/i).length).toBeGreaterThan(0);
  });

  it("shows protection status including recovery phrase date", async () => {
    render(<VaultSecurityReview serverStatus={serverStatus} />);

    expect(await screen.findByText("Protection status")).toBeTruthy();
    expect(screen.getByText("Recovery phrase configured")).toBeTruthy();
    expect(screen.getByText(/created on/i)).toBeTruthy();
    expect(screen.getAllByText(/enabled · 15 minutes/i).length).toBeGreaterThan(0);
  });

  it("explains passkey sign-in vs vault unlock and PRF limitations", async () => {
    render(<VaultSecurityReview serverStatus={serverStatus} />);

    expect(await screen.findByText(/passkey vault unlock compatibility/i)).toBeTruthy();
    expect(screen.getAllByText(/account passkey/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/webauthn prf/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not configured/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /manage passkey vault unlock/i }).getAttribute("href")).toBe(
      "/vault/settings"
    );
  });

  it("shows account and vault separation reminder", async () => {
    render(<VaultSecurityReview serverStatus={serverStatus} />);

    expect(await screen.findByText(/your account and vault are separate/i)).toBeTruthy();
    expect(screen.getByText(/cannot recover your vault without it/i)).toBeTruthy();
  });

  it("lists safe security events without note content", async () => {
    render(<VaultSecurityReview serverStatus={serverStatus} />);

    expect(await screen.findByText("Vault unlocked with vault password")).toBeTruthy();
    expect(screen.queryByText(/SENTINEL-PRIVATE-LETTER/)).toBeNull();
    expect(screen.queryByText(/decrypted title/i)).toBeNull();
  });

  it("successful recovery drill verifies phrase locally", async () => {
    vi.mocked(vaultApi.unlockEnvelope).mockResolvedValue({
      encryptedVaultKey: { ciphertext: "ct", iv: "iv", tag: "tag" },
      kdfMetadata: { kdf: "argon2id", salt: "s", iterations: 3, memoryKiB: 65536, parallelism: 4 },
    });
    vi.mocked(verifyRecoveryPhraseDrill).mockResolvedValue({ status: "verified" });

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<VaultSecurityReview serverStatus={serverStatus} />);

    fireEvent.change(screen.getByLabelText(/recovery phrase/i), {
      target: { value: "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda" },
    });
    fireEvent.click(screen.getByRole("button", { name: /test recovery phrase/i }));

    await waitFor(() => {
      expect(verifyRecoveryPhraseDrill).toHaveBeenCalled();
    });

    expect(vaultApi.unlockEnvelope).toHaveBeenCalledWith("recovery_phrase");
    const fetchBodies = fetchSpy.mock.calls
      .map((call) => call[1]?.body)
      .filter(Boolean)
      .map((body) => String(body));
    expect(fetchBodies.some((body) => body.includes("alpha beta"))).toBe(false);
    expect(mocks.recordEvent).toHaveBeenCalledWith("recovery_phrase_test_succeeded");
    expect(await screen.findByText(/recovery phrase verified/i)).toBeTruthy();

    fetchSpy.mockRestore();
  });

  it("failed recovery drill shows error without rotating phrase", async () => {
    vi.mocked(vaultApi.unlockEnvelope).mockResolvedValue({
      encryptedVaultKey: { ciphertext: "ct", iv: "iv", tag: "tag" },
      kdfMetadata: { kdf: "argon2id", salt: "s", iterations: 3, memoryKiB: 65536, parallelism: 4 },
    });
    vi.mocked(verifyRecoveryPhraseDrill).mockResolvedValue({ status: "invalid_phrase" });

    render(<VaultSecurityReview serverStatus={serverStatus} />);

    fireEvent.change(screen.getByLabelText(/recovery phrase/i), {
      target: { value: "wrong words here for testing failure path only now" },
    });
    fireEvent.click(screen.getByRole("button", { name: /test recovery phrase/i }));

    expect(await screen.findByText(/recovery phrase did not work/i)).toBeTruthy();
    expect(mocks.recordEvent).toHaveBeenCalledWith("recovery_phrase_test_failed");
    expect(vaultApi.replaceRecoveryPhrase).toBeUndefined();
  });

  it("does not expose PRF output in UI", async () => {
    mocks.probeEnvironment.mockResolvedValue({
      userAgent: "test",
      secureContext: true,
      webauthnAvailable: true,
      credentialsApiAvailable: true,
      clientCapabilitiesAvailable: true,
      clientCapabilitiesPrf: false,
      capabilityProbe: "unsupported",
    });

    render(<VaultSecurityReview serverStatus={serverStatus} />);

    await screen.findByText(/passkey vault unlock compatibility/i);
    expect(screen.queryByText(/prfOutput/i)).toBeNull();
    expect(screen.queryByText(/base64/i)).toBeNull();
  });
});
