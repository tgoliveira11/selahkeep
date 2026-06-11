import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as listGet } from "@/app/api/account/passkeys/route";
import { POST as registerPost } from "@/app/api/account/passkeys/register/route";
import { DELETE as deletePasskey } from "@/app/api/account/passkeys/[id]/route";
import { POST as enableVaultUnlockPost } from "@/app/api/account/passkeys/[id]/enable-vault-unlock/route";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  listPasskeys: vi.fn(),
  getRegistrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
  removePasskey: vi.fn(),
  getVaultUnlockAuthOptions: vi.fn(),
  enableVaultUnlock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
}));

vi.mock("@/server/services/passkey-account-service", () => ({
  passkeyAccountService: {
    listPasskeys: mocks.listPasskeys,
    getRegistrationOptions: mocks.getRegistrationOptions,
    verifyRegistration: mocks.verifyRegistration,
    removePasskey: mocks.removePasskey,
    getVaultUnlockAuthOptions: mocks.getVaultUnlockAuthOptions,
    enableVaultUnlock: mocks.enableVaultUnlock,
  },
}));

describe("account passkeys API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("lists account passkeys", async () => {
    mocks.listPasskeys.mockResolvedValue([
      {
        id: "pk-1",
        friendlyName: "Passkey",
        capabilityLabel: "Sign-in only",
      },
    ]);
    const res = await listGet();
    expect(res.status).toBe(200);
  });

  it("requires session for registration options", async () => {
    mocks.getRegistrationOptions.mockResolvedValue({ challenge: "abc" });
    const res = await registerPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "options" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.requireSessionUser).toHaveBeenCalled();
  });

  it("deletes a passkey by id", async () => {
    mocks.removePasskey.mockResolvedValue({ success: true });
    const res = await deletePasskey(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pk-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns vault unlock auth options", async () => {
    mocks.getVaultUnlockAuthOptions.mockResolvedValue({ challenge: "unlock" });
    const res = await enableVaultUnlockPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "options" }),
      }),
      { params: Promise.resolve({ id: "pk-1" }) }
    );
    expect(res.status).toBe(200);
  });
});
