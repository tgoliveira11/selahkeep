import { describe, expect, it, vi, afterEach } from "vitest";
import {
  applyContentSecurityPolicy,
  buildContentSecurityPolicy,
  createContentSecurityPolicyNonce,
} from "@/lib/security/content-security-policy";

describe("content-security-policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a base64 nonce", () => {
    const nonce = createContentSecurityPolicyNonce();
    expect(nonce.length).toBeGreaterThan(10);
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("uses nonce and strict-dynamic for production scripts", () => {
    vi.stubEnv("NODE_ENV", "production");
    const policy = buildContentSecurityPolicy("test-nonce");
    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).toContain("'wasm-unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).toContain("worker-src 'self' blob:");
  });

  it("allows the on-device voice model origins in connect-src by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VOICE_NOTES_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_VOICE_MODEL_HOST", "");
    const policy = buildContentSecurityPolicy("n");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("https://huggingface.co");
    expect(policy).toContain("https://cdn.jsdelivr.net");
  });

  it("restricts connect-src to the self-hosted model host when configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VOICE_MODEL_HOST", "https://models.example.com");
    const policy = buildContentSecurityPolicy("n");
    expect(policy).toContain("connect-src 'self' https://models.example.com");
    expect(policy).not.toContain("huggingface.co");
  });

  it("omits voice origins from connect-src when voice is disabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VOICE_NOTES_ENABLED", "false");
    const policy = buildContentSecurityPolicy("n");
    expect(policy).not.toContain("huggingface.co");
  });

  it("allows dev eval and inline scripts", () => {
    vi.stubEnv("NODE_ENV", "development");
    const policy = buildContentSecurityPolicy("ignored");
    expect(policy).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
    expect(policy).toContain("connect-src 'self' ws:");
  });

  it("sets request and response CSP headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    const requestHeaders = new Headers();
    const response = new Response(null, { headers: new Headers() });
    applyContentSecurityPolicy(requestHeaders, response, "abc123");
    expect(requestHeaders.get("x-nonce")).toBe("abc123");
    expect(requestHeaders.get("Content-Security-Policy")).toContain("'nonce-abc123'");
    expect(response.headers.get("Content-Security-Policy")).toContain("'nonce-abc123'");
  });
});
