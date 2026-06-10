import { describe, it, expect, vi } from "vitest";
import { safeLogger } from "@/lib/logger";

describe("safe logger", () => {
  it("redacts sensitive keys", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    safeLogger.info("event", { title: "secret", endpoint: "/api/letters" });
    expect(spy.mock.calls[0][0]).toContain("[REDACTED]");
    expect(spy.mock.calls[0][0]).toContain("/api/letters");
    spy.mockRestore();
  });

  it("logs without metadata", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    safeLogger.info("plain");
    expect(spy.mock.calls[0][0]).toBe("plain");
    spy.mockRestore();
  });

  it("logs warnings and errors", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    safeLogger.warn("warn");
    safeLogger.error("error", { nested: { body: "hidden" } });
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain("[REDACTED]");
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
