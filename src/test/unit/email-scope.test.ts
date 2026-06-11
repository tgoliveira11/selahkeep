import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashEmailForScope } from "@/server/policies/email-scope";

describe("hashEmailForScope", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
  });

  it("throws when pepper is missing", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect(() => hashEmailForScope("user@example.com")).toThrow("NEXTAUTH_SECRET");
  });

  it("returns stable hashed scope ids", () => {
    const a = hashEmailForScope("User@Example.com");
    const b = hashEmailForScope("user@example.com");
    expect(a).toBe(b);
    expect(a).not.toContain("user@example.com");
  });
});
