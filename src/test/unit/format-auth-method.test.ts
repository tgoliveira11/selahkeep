import { describe, it, expect } from "vitest";
import { formatAuthMethod } from "@/lib/ui/format-auth-method";

describe("formatAuthMethod", () => {
  it("formats known methods", () => {
    expect(formatAuthMethod("password")).toBe("Email and password");
    expect(formatAuthMethod("passkey")).toBe("Passkey");
    expect(formatAuthMethod("google")).toBe("Google");
    expect(formatAuthMethod("apple")).toBe("Apple");
    expect(formatAuthMethod("microsoft")).toBe("Microsoft");
  });

  it("formats unknown methods safely", () => {
    expect(formatAuthMethod("mystery")).toBe("Unknown");
  });
});
