import { describe, it, expect } from "vitest";
import { formatAuthProvider } from "@/lib/ui/format-auth-provider";

describe("formatAuthProvider", () => {
  it("maps known providers to friendly labels", () => {
    expect(formatAuthProvider("credentials")).toBe("Email and password");
    expect(formatAuthProvider("google")).toBe("Google");
    expect(formatAuthProvider("apple")).toBe("Apple");
    expect(formatAuthProvider("azure-ad")).toBe("Microsoft");
  });

  it("returns the raw provider id for unknown values", () => {
    expect(formatAuthProvider("github")).toBe("github");
  });
});
