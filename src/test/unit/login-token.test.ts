import { describe, it, expect } from "vitest";
import { createOpaqueToken, hashOpaqueToken } from "@/server/policies/login-token";

describe("login token policy", () => {
  it("creates and hashes opaque tokens", () => {
    const token = createOpaqueToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hashOpaqueToken(token)).not.toBe(hashOpaqueToken(createOpaqueToken()));
  });

  it("requires NEXTAUTH_SECRET for hashing", () => {
    const previous = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    expect(() => hashOpaqueToken("token")).toThrow(/NEXTAUTH_SECRET is not configured/);
    process.env.NEXTAUTH_SECRET = previous;
  });
});
