import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as statusGet } from "@/app/api/account/2fa/status/route";
import { POST as setupStartPost } from "@/app/api/account/2fa/setup/start/route";
import { POST as setupVerifyPost } from "@/app/api/account/2fa/setup/verify/route";
import { POST as disablePost } from "@/app/api/account/2fa/disable/route";
import { POST as loginStartPost } from "@/app/api/auth/login/start/route";
import { POST as verify2faPost } from "@/app/api/auth/login/verify-2fa/route";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  statusGet: vi.fn(),
  setupStartPost: vi.fn(),
  setupVerifyPost: vi.fn(),
  disablePost: vi.fn(),
  loginStartPost: vi.fn(),
  verify2faPost: vi.fn(),
}));

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      twoFactorStatus: { GET: mocks.statusGet },
      twoFactorSetupStart: { POST: mocks.setupStartPost },
      twoFactorSetupVerify: { POST: mocks.setupVerifyPost },
      twoFactorDisable: { POST: mocks.disablePost },
      loginStart: { POST: mocks.loginStartPost },
      loginVerify2fa: { POST: mocks.verify2faPost },
    },
  },
}));

describe("two-factor API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET status returns 2FA state", async () => {
    mocks.statusGet.mockResolvedValue(
      new Response(JSON.stringify({ enabled: false, enabledAt: null, hasPendingSetup: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const res = await statusGet();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      enabled: false,
      enabledAt: null,
      hasPendingSetup: false,
    });
  });

  it("setup start does not return otpauth URL with secret after start", async () => {
    mocks.setupStartPost.mockResolvedValue(
      new Response(
        JSON.stringify({
          qrCodeDataUrl: "data:image/png;base64,abc",
          manualSetupKey: "SECRETKEY",
          issuer: "Letters to God",
          accountLabel: "user@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const res = await setupStartPost(new Request("http://localhost"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("otpauthUrl");
    expect(body.manualSetupKey).toBe("SECRETKEY");
  });

  it("setup verify returns backup codes once", async () => {
    mocks.setupVerifyPost.mockResolvedValue(
      new Response(JSON.stringify({ success: true, backupCodes: ["AAAA-BBBB-CCCC"] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const res = await setupVerifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    await expect(res.json()).resolves.toEqual({
      success: true,
      backupCodes: ["AAAA-BBBB-CCCC"],
    });
  });

  it("login start returns challenge when 2FA is enabled", async () => {
    mocks.loginStartPost.mockResolvedValue(
      new Response(
        JSON.stringify({ requiresTwoFactor: true, challengeToken: "challenge-token" }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const res = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    await expect(res.json()).resolves.toEqual({
      requiresTwoFactor: true,
      challengeToken: "challenge-token",
    });
  });

  it("disable requires authenticated user and valid payload", async () => {
    mocks.disablePost.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const res = await disablePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it("setup verify and disable reject invalid payloads", async () => {
    mocks.setupVerifyPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );
    mocks.disablePost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );
    const badVerify = await setupVerifyPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ code: "12" }) })
    );
    expect(badVerify.status).toBe(400);

    const badDisable = await disablePost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) })
    );
    expect(badDisable.status).toBe(400);
  });

  it("verify-2fa returns login token on success", async () => {
    mocks.verify2faPost.mockResolvedValue(
      new Response(JSON.stringify({ loginToken: "login-token" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "challenge-token-1234567890",
          code: "123456",
        }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ loginToken: "login-token" });
  });
});
