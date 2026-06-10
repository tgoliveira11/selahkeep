import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { safeLogger } from "@/lib/logger";

describe("safe logger redaction", () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts title and body from logs", () => {
    safeLogger.info("test event", {
      title: "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345",
      body: "secret body",
      endpoint: "/api/letters",
    });

    const output = logs.join(" ");
    expect(output).not.toContain("SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345");
    expect(output).not.toContain("secret body");
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("/api/letters");
  });

  it("redacts recovery code", () => {
    safeLogger.error("unlock failed", { recoveryCode: "river-candle-forest" });
    const output = logs.join(" ");
    expect(output).not.toContain("river-candle-forest");
    expect(output).toContain("[REDACTED]");
  });
});
