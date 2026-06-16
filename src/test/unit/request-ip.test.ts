import { describe, it, expect } from "vitest";
import { getClientIp } from "@/modules/security/ip/request-ip";

describe("getClientIp", () => {
  it("prefers the first x-forwarded-for address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 198.51.100.2" },
    });
    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip when forwarded header is empty", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": " , ", "x-real-ip": "198.51.100.9" },
    });
    expect(getClientIp(request)).toBe("198.51.100.9");
  });

  it("returns unknown-ip when no proxy headers are present", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown-ip");
  });
});
