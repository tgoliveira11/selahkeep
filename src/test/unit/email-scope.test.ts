import { describe, it, expect } from "vitest";
import { hashEmailForScope } from "@/server/policies/email-scope";

describe("hashEmailForScope", () => {
  it("returns stable hashed scope ids", () => {
    const a = hashEmailForScope("User@Example.com");
    const b = hashEmailForScope("user@example.com");
    expect(a).toBe(b);
    expect(a).not.toContain("user@example.com");
  });
});
