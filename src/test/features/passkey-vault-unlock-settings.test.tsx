/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PasskeyVaultUnlockSetup } from "@/features/passkey/passkey-vault-unlock-setup";
import {
  PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE,
  PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE,
  PASSKEY_VAULT_UNLOCK_TEST_SUCCEEDED_MESSAGE,
} from "@/lib/passkey/messages";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  listPasskeys: vi.fn(),
  getSessionVaultKey: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  startAuthentication: vi.fn(),
  extractPasskeyPrfOutput: vi.fn(),
  wrapVaultKeyForPasskey: vi.fn(),
  probeEnvironment: vi.fn(),
}));

vi.mock("@tgoliveira/secure-auth/client", () => ({
  passkeyAccountApi: {
    list: mocks.listPasskeys,
  },
}));

vi.mock("@/lib/crypto-client/vault", () => ({
  getSessionVaultKey: mocks.getSessionVaultKey,
}));

vi.mock("@/lib/api-client/client", () => ({
  apiClient: {
    get: mocks.apiGet,
    post: mocks.apiPost,
    delete: mocks.apiDelete,
  },
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: mocks.startAuthentication,
}));

vi.mock("@/lib/crypto-client/passkey-vault", () => ({
  extractPasskeyPrfOutput: mocks.extractPasskeyPrfOutput,
  wrapVaultKeyForPasskey: mocks.wrapVaultKeyForPasskey,
}));

vi.mock("@/lib/passkey/prepare-webauthn-options", () => ({
  prepareAuthenticationOptions: (options: unknown) => options,
}));

vi.mock("@/lib/passkey/passkey-prf-diagnostics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/passkey/passkey-prf-diagnostics")>();
  return {
    ...actual,
    probePasskeyPrfEnvironmentAsync: mocks.probeEnvironment,
  };
});

function mockEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    userAgent: "vitest",
    secureContext: true,
    webauthnAvailable: true,
    credentialsApiAvailable: true,
    clientCapabilitiesAvailable: true,
    clientCapabilitiesPrf: null,
    capabilityProbe: "unknown" as const,
    ...overrides,
  };
}

describe("PasskeyVaultUnlockSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionVaultKey.mockReturnValue({} as CryptoKey);
    mocks.listPasskeys.mockResolvedValue({
      passkeys: [{ id: "pk-1", friendlyName: "MacBook", signInEnabled: true }],
    });
    mocks.apiGet.mockResolvedValue({
      signInEnabled: true,
      vaultUnlockEnabled: false,
      prfSupported: null,
      credentialId: "cred-1",
    });
    mocks.probeEnvironment.mockResolvedValue(mockEnvironment());
    mocks.apiPost.mockResolvedValue({ challenge: "abc", extensions: { prf: { eval: {} } } });
    mocks.startAuthentication.mockResolvedValue({
      id: "cred-1",
      clientExtensionResults: {},
    });
    mocks.extractPasskeyPrfOutput.mockReturnValue(new Uint8Array(32));
    mocks.wrapVaultKeyForPasskey.mockResolvedValue({ version: "enc-v1" });
  });

  it("explains account passkey login is separate from vault unlock", async () => {
    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    expect(await screen.findByText(/account passkeys sign you in to selahkeep/i)).toBeTruthy();
    expect(screen.getByText(/webauthn prf extension/i)).toBeTruthy();
  });

  it("shows unknown capability notice without blocking setup", async () => {
    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    expect(await screen.findByText(/could not be confirmed before setup/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /set up vault unlock/i })).toBeTruthy();
  });

  it("enables vault unlock when PRF output is returned", async () => {
    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    fireEvent.click(await screen.findByRole("button", { name: /set up vault unlock/i }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        `/api/account/passkeys/pk-1/enable-vault-unlock`,
        expect.objectContaining({
          action: "verify",
          prfVaultEnvelope: true,
        })
      );
    });
    expect(await screen.findByText(PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE)).toBeTruthy();
  });

  it("allows setup attempt when capability probe is unknown", async () => {
    mocks.probeEnvironment.mockResolvedValue(mockEnvironment({ capabilityProbe: "unknown" }));
    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    fireEvent.click(await screen.findByRole("button", { name: /set up vault unlock/i }));
    await waitFor(() => expect(mocks.startAuthentication).toHaveBeenCalled());
  });

  it("allows setup when client capabilities deny PRF pre-ceremony", async () => {
    mocks.probeEnvironment.mockResolvedValue(
      mockEnvironment({ capabilityProbe: "unknown", clientCapabilitiesPrf: false })
    );
    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    fireEvent.click(await screen.findByRole("button", { name: /set up vault unlock/i }));
    await waitFor(() => expect(mocks.startAuthentication).toHaveBeenCalled());
    expect(screen.queryByText(/PRF extension is not supported/i)).toBeNull();
  });

  it("shows prf_not_returned when ceremony omits PRF output", async () => {
    mocks.extractPasskeyPrfOutput.mockReturnValue(null);
    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    fireEvent.click(await screen.findByRole("button", { name: /set up vault unlock/i }));
    expect(await screen.findByText(/Authentication completed, but your passkey or browser did not return PRF output/i)).toBeTruthy();
    expect(mocks.wrapVaultKeyForPasskey).not.toHaveBeenCalled();
  });

  it("requires unlocked vault to set up passkey vault unlock", async () => {
    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked={false} />);
    const button = await screen.findByRole("button", { name: /set up vault unlock/i });
    expect(button).toBeDisabled();
  });

  it("disables vault unlock for configured passkey with PRF proof", async () => {
    mocks.apiGet.mockResolvedValue({
      signInEnabled: true,
      vaultUnlockEnabled: true,
      prfSupported: true,
      credentialId: "cred-1",
    });
    mocks.apiPost.mockImplementation(async (path: string, body: unknown) => {
      if (path.includes("/vault-unlock") && (body as { action?: string }).action === "disable-options") {
        return { challenge: "abc", extensions: { prf: { eval: {} } } };
      }
      return { challenge: "abc", extensions: { prf: { eval: {} } } };
    });

    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    fireEvent.click(await screen.findByRole("button", { name: /^disable$/i }));

    await waitFor(() => {
      expect(mocks.apiDelete).toHaveBeenCalledWith("/api/account/passkeys/pk-1/vault-unlock", {
        response: expect.objectContaining({ id: "cred-1" }),
        prfVaultEnvelope: true,
      });
    });
    expect(await screen.findByText(PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE)).toBeTruthy();
  });

  it("shows read-only passkey vault status when WebAuthn is unavailable but envelope exists", async () => {
    mocks.probeEnvironment.mockResolvedValue(
      mockEnvironment({
        webauthnAvailable: false,
        credentialsApiAvailable: false,
        capabilityProbe: "unsupported",
      })
    );
    mocks.apiGet.mockResolvedValue({
      signInEnabled: true,
      vaultUnlockEnabled: true,
      prfSupported: true,
      credentialId: "cred-1",
    });

    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    expect(
      await screen.findByText(/cannot be managed in this browser/i)
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^disable$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^replace$/i })).toBeNull();
  });

  it("tests configured passkey via authenticate options", async () => {
    mocks.apiGet.mockResolvedValue({
      signInEnabled: true,
      vaultUnlockEnabled: true,
      prfSupported: true,
      credentialId: "cred-1",
    });

    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    fireEvent.click(await screen.findByRole("button", { name: /^test$/i }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith("/api/passkeys/authenticate", { action: "options" });
    });
    expect(await screen.findByText(PASSKEY_VAULT_UNLOCK_TEST_SUCCEEDED_MESSAGE)).toBeTruthy();
  });

  it("shows configured state when vault unlock envelope exists", async () => {
    mocks.apiGet.mockResolvedValue({
      signInEnabled: true,
      vaultUnlockEnabled: true,
      prfSupported: true,
      credentialId: "cred-1",
    });

    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    expect(await screen.findByText(/passkey vault unlock configured/i)).toBeTruthy();
    expect(screen.getByText(/vault unlock: configured/i)).toBeTruthy();
  });

  it("replaces configured passkey vault unlock after PRF disable proof", async () => {
    mocks.apiGet
      .mockResolvedValueOnce({
        signInEnabled: true,
        vaultUnlockEnabled: true,
        prfSupported: true,
        credentialId: "cred-1",
      })
      .mockResolvedValue({
        signInEnabled: true,
        vaultUnlockEnabled: false,
        prfSupported: null,
        credentialId: "cred-1",
      });
    mocks.apiPost.mockImplementation(async (path: string, body: unknown) => {
      const payload = body as { action?: string };
      if (path.includes("/vault-unlock") && payload.action === "disable-options") {
        return { challenge: "abc", extensions: { prf: { eval: {} } } };
      }
      if (path.includes("/enable-vault-unlock") && payload.action === "options") {
        return { challenge: "abc", extensions: { prf: { eval: {} } } };
      }
      return { success: true };
    });

    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    fireEvent.click(await screen.findByRole("button", { name: /^replace$/i }));

    await waitFor(() => {
      expect(mocks.apiDelete).toHaveBeenCalled();
      expect(mocks.wrapVaultKeyForPasskey).toHaveBeenCalled();
    });
  });

  it("prompts to add account passkey when none exist", async () => {
    mocks.listPasskeys.mockResolvedValue({ passkeys: [] });
    render(<PasskeyVaultUnlockSetup userId={USER_ID} vaultUnlocked />);
    expect(await screen.findByText(/add an account passkey/i)).toBeTruthy();
  });
});
