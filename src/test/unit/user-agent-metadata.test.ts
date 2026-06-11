import { describe, it, expect, beforeEach, vi } from "vitest";
import { hashUserAgent, parseUserAgentMetadata } from "@/lib/user-agent-metadata";

describe("user agent metadata", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
  });

  it("parses Android tablet", () => {
    const ua = "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Tablet Safari";
    expect(parseUserAgentMetadata(ua)).toMatchObject({
      platform: "Android",
      deviceType: "tablet",
    });
  });

  it("parses mobile Safari on iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseUserAgentMetadata(ua)).toMatchObject({
      browser: "Safari",
      platform: "iOS",
      deviceType: "mobile",
    });
  });

  it("parses Edge and Firefox", () => {
    expect(parseUserAgentMetadata("Mozilla/5.0 Edg/120.0").browser).toBe("Edge");
    expect(parseUserAgentMetadata("Mozilla/5.0 Firefox/120.0").browser).toBe("Firefox");
  });

  it("parses iPadOS and ChromeOS platforms", () => {
    expect(parseUserAgentMetadata("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)").platform).toBe(
      "iPadOS"
    );
    expect(parseUserAgentMetadata("Mozilla/5.0 (X11; CrOS x86_64)").platform).toBe("ChromeOS");
  });

  it("parses Chrome on macOS desktop", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseUserAgentMetadata(ua)).toEqual({
      browser: "Chrome",
      platform: "macOS",
      deviceType: "desktop",
    });
  });

  it("uses navigator platform hints when user agent is sparse", () => {
    expect(parseUserAgentMetadata("Mozilla/5.0", "Win32")).toMatchObject({
      platform: "Windows",
      deviceType: "desktop",
    });
  });

  it("returns unknown for empty user agent", () => {
    expect(parseUserAgentMetadata("")).toEqual({
      browser: "unknown",
      platform: "unknown",
      deviceType: "unknown",
    });
  });

  it("hashes user agent without storing raw value in hash output", () => {
    const hash = hashUserAgent("Mozilla/5.0 test");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("Mozilla");
  });
});
