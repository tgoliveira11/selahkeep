import { describe, it, expect } from "vitest";
import { getLoginRequestIp, runWithLoginRequestContext } from "@/lib/auth/login-request-context";

describe("login request context", () => {
  it("stores and reads client IP for credentials login", () => {
    expect(getLoginRequestIp()).toBeUndefined();
    runWithLoginRequestContext("203.0.113.44", () => {
      expect(getLoginRequestIp()).toBe("203.0.113.44");
    });
    expect(getLoginRequestIp()).toBeUndefined();
  });
});
