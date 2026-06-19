/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PasskeySetup } from "@/features/recovery/passkey-setup";
import {
  PASSKEY_ORPHAN_CREDENTIAL_NOTE,
  PASSKEY_VAULT_REGISTERED_MESSAGE,
} from "@/lib/passkey/messages";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getSessionVaultKey: vi.fn(),
  probeEnvironment: vi.fn(),
  apiPost: vi.fn(),
  startRegistration: vi.fn(),
  extractPasskeyPrfOutput: vi.fn(),
  wrapVaultKeyForPasskey: vi.fn(),
  removeAll: vi.fn(),
}));

vi.mock("@/lib/crypto-client/vault", () => ({
  getSessionVaultKey: mocks.getSessionVaultKey,
}));

vi.mock("@/lib/passkey/passkey-prf-diagnostics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/passkey/passkey-prf-diagnostics")>();
  return {
    ...actual,
    probePasskeyPrfEnvironmentAsync: mocks.probeEnvironment,
  };
});

vi.mock("@/lib/passkey/login-hint", () => ({
  setPasskeyLoginHint: vi.fn(),
}));

vi.mock("@/lib/api-client/client", () => ({
  apiClient: {
    post: mocks.apiPost,
  },
}));

vi.mock("@/lib/api-client/passkeys", () => ({
  passkeysApi: {
    removeAll: mocks.removeAll,
  },
}));

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: mocks.startRegistration,
}));

vi.mock("@/lib/crypto-client/passkey-vault", () => ({
  extractPasskeyPrfOutput: mocks.extractPasskeyPrfOutput,
  wrapVaultKeyForPasskey: mocks.wrapVaultKeyForPasskey,
}));

vi.mock("@/lib/passkey/prepare-webauthn-options", () => ({
  prepareRegistrationOptions: (options: unknown) => options,
}));

function mockEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    userAgent: "vitest",
    secureContext: true,
    webauthnAvailable: true,
    credentialsApiAvailable: true,
    clientCapabilitiesAvailable: true,
    clientCapabilitiesPrf: null,
    capabilityProbe: "supported" as const,
    ...overrides,
  };
}

describe("PasskeySetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionVaultKey.mockReturnValue({} as CryptoKey);
    mocks.probeEnvironment.mockResolvedValue(mockEnvironment());
    mocks.apiPost
      .mockResolvedValueOnce({ challenge: "reg-challenge" })
      .mockResolvedValueOnce({ verified: true, credentialId: "cred-id" });
    mocks.startRegistration.mockResolvedValue({
      id: "cred-id",
      clientExtensionResults: { prf: { results: { first: new ArrayBuffer(32) } } },
    });
    mocks.extractPasskeyPrfOutput.mockReturnValue(new Uint8Array(32));
    mocks.wrapVaultKeyForPasskey.mockResolvedValue({ version: "enc-v1" });
    window.confirm = vi.fn(() => true);
  });

  it("registers passkey vault envelope when PRF output is available", async () => {
    const onStatusChange = vi.fn();
    render(<PasskeySetup userId={USER_ID} hasPasskey={false} onStatusChange={onStatusChange} />);

    fireEvent.click(screen.getByRole("button", { name: /set up passkey/i }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith("/api/passkeys/register", {
        action: "options",
        vaultOnly: true,
      });
      expect(mocks.apiPost).toHaveBeenCalledWith("/api/passkeys/register", {
        action: "verify",
        response: expect.any(Object),
        encryptedVaultKey: { version: "enc-v1" },
        prfVaultEnvelope: true,
        vaultOnly: true,
      });
    });
    expect(await screen.findByText(PASSKEY_VAULT_REGISTERED_MESSAGE)).toBeTruthy();
    expect(onStatusChange).toHaveBeenCalled();
  });

  it("allows ceremony when client capabilities deny PRF pre-ceremony", async () => {
    mocks.probeEnvironment.mockResolvedValue(
      mockEnvironment({ capabilityProbe: "unknown", clientCapabilitiesPrf: false })
    );

    render(<PasskeySetup userId={USER_ID} hasPasskey={false} onStatusChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /set up passkey/i }));

    await waitFor(() => expect(mocks.startRegistration).toHaveBeenCalled());
    expect(screen.queryByText(/PRF extension is not supported/i)).toBeNull();
  });

  it("allows ceremony when capability probe is unknown", async () => {
    mocks.probeEnvironment.mockResolvedValue(mockEnvironment({ capabilityProbe: "unknown" }));

    render(<PasskeySetup userId={USER_ID} hasPasskey={false} onStatusChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /set up passkey/i }));

    await waitFor(() => expect(mocks.startRegistration).toHaveBeenCalled());
  });

  it("does not send vault envelope when PRF output is missing after registration", async () => {
    mocks.extractPasskeyPrfOutput.mockReturnValue(null);

    render(<PasskeySetup userId={USER_ID} hasPasskey={false} onStatusChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /set up passkey/i }));

    await waitFor(() => {
      expect(mocks.startRegistration).toHaveBeenCalled();
    });
    expect(mocks.wrapVaultKeyForPasskey).not.toHaveBeenCalled();
    expect(mocks.apiPost).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/Authentication completed, but your passkey or browser did not return PRF output/i)
    ).toBeTruthy();
    expect(screen.getByText(PASSKEY_ORPHAN_CREDENTIAL_NOTE)).toBeTruthy();
    expect(screen.queryByText(PASSKEY_VAULT_REGISTERED_MESSAGE)).toBeNull();
  });

  it("shows cancelled state without vault registration messaging", async () => {
    mocks.startRegistration.mockRejectedValue(Object.assign(new Error("cancelled"), { name: "NotAllowedError" }));

    render(<PasskeySetup userId={USER_ID} hasPasskey={false} onStatusChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /set up passkey/i }));

    expect(await screen.findByText(/passkey prompt was dismissed/i)).toBeTruthy();
    expect(screen.queryByText(/did not return PRF output/i)).toBeNull();
  });

  it("blocks passkey setup when WebAuthn is unavailable", async () => {
    mocks.probeEnvironment.mockResolvedValue(
      mockEnvironment({
        webauthnAvailable: false,
        credentialsApiAvailable: false,
        capabilityProbe: "unsupported",
      })
    );

    render(<PasskeySetup userId={USER_ID} hasPasskey={false} onStatusChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /set up passkey/i }));

    expect(await screen.findByText(/WebAuthn not available/i)).toBeTruthy();
    expect(mocks.startRegistration).not.toHaveBeenCalled();
    expect(mocks.wrapVaultKeyForPasskey).not.toHaveBeenCalled();
  });
});
