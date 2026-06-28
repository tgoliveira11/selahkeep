import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  filterAuthenticationOptionsForCredential,
  requestVaultUnlockAuthenticationOptions,
  runVaultUnlockAuthenticationCeremony,
  runVaultUnlockAuthenticationCeremonyWithOptions,
  verifyVaultUnlockAuthentication,
  VAULT_UNLOCK_AUTHENTICATE_PURPOSE,
} from "@/lib/passkey/vault-unlock-authenticate";
import { PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE } from "@/lib/passkey/messages";

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  startAuthentication: vi.fn(),
}));

vi.mock("@/lib/api-client/client", () => ({
  apiClient: {
    post: mocks.apiPost,
  },
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: mocks.startAuthentication,
}));

describe("vault unlock authenticate client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiPost.mockResolvedValue({
      challenge: "abc",
      allowCredentials: [
        { id: "vault-cred", type: "public-key", transports: ["internal"] },
      ],
    });
    mocks.startAuthentication.mockResolvedValue({
      id: "vault-cred",
      clientExtensionResults: { prf: { results: { first: new Uint8Array(32) } } },
    });
  });

  it("requests vault unlock purpose when fetching options", async () => {
    await requestVaultUnlockAuthenticationOptions();
    expect(mocks.apiPost).toHaveBeenCalledWith("/api/passkeys/authenticate", {
      action: "options",
      purpose: VAULT_UNLOCK_AUTHENTICATE_PURPOSE,
    });
  });

  it("preserves transports when filtering to a specific vault credential", () => {
    const filtered = filterAuthenticationOptionsForCredential(
      {
        challenge: "abc",
        allowCredentials: [
          { id: "vault-a", type: "public-key", transports: ["hybrid"] },
          { id: "vault-b", type: "public-key", transports: ["internal"] },
        ],
      },
      "vault-b"
    );
    expect(filtered.allowCredentials).toEqual([
      { id: "vault-b", type: "public-key", transports: ["internal"] },
    ]);
  });

  it("fails closed when filtered credential is not in allowCredentials", () => {
    expect(() =>
      filterAuthenticationOptionsForCredential(
        {
          challenge: "abc",
          allowCredentials: [{ id: "vault-a", type: "public-key", transports: ["internal"] }],
        },
        "missing-cred"
      )
    ).toThrow(PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE);
  });

  it("settings test and real unlock share the same filtered credential entry", () => {
    const serverOptions = {
      challenge: "abc",
      allowCredentials: [{ id: "vault-cred", type: "public-key", transports: ["internal"] }],
    } as const;

    const realUnlock = filterAuthenticationOptionsForCredential(serverOptions);
    const settingsTest = filterAuthenticationOptionsForCredential(serverOptions, "vault-cred");

    expect(realUnlock.allowCredentials).toEqual(serverOptions.allowCredentials);
    expect(settingsTest.allowCredentials).toEqual(serverOptions.allowCredentials);
  });

  it("runs ceremony with prefetched options without fetching again", async () => {
    const prefetched = {
      challenge: "prefetched",
      allowCredentials: [{ id: "vault-cred", type: "public-key", transports: ["internal"] }],
    };
    await import("@/lib/passkey/vault-unlock-authenticate").then((m) =>
      m.runVaultUnlockAuthenticationCeremonyWithOptions(prefetched, "vault-cred")
    );
    expect(mocks.apiPost).not.toHaveBeenCalled();
    expect(mocks.startAuthentication).toHaveBeenCalled();
  });

  it("runs ceremony with vault unlock options only", async () => {
    await runVaultUnlockAuthenticationCeremony("vault-cred");
    expect(mocks.apiPost).toHaveBeenCalledWith("/api/passkeys/authenticate", {
      action: "options",
      purpose: VAULT_UNLOCK_AUTHENTICATE_PURPOSE,
    });
    expect(mocks.startAuthentication).toHaveBeenCalled();
  });

  it("verifies with vault unlock purpose", async () => {
    const assertion = { id: "vault-cred" };
    await verifyVaultUnlockAuthentication(assertion as never);
    expect(mocks.apiPost).toHaveBeenCalledWith("/api/passkeys/authenticate", {
      action: "verify",
      purpose: VAULT_UNLOCK_AUTHENTICATE_PURPOSE,
      response: assertion,
    });
  });
});
