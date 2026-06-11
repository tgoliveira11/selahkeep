import { describe, it, expect, vi } from "vitest";
import {
  getSessionLastUsedUpdateIntervalMs,
  getSessionMaxAgeMs,
} from "@/lib/session-config";

describe("session config", () => {
  it("defaults last-used interval to 300 seconds", () => {
    vi.stubEnv("SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS", "");
    expect(getSessionLastUsedUpdateIntervalMs()).toBe(300_000);
  });

  it("parses custom last-used interval", () => {
    vi.stubEnv("SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS", "120");
    expect(getSessionLastUsedUpdateIntervalMs()).toBe(120_000);
  });

  it("returns session max age in ms", () => {
    expect(getSessionMaxAgeMs()).toBeGreaterThan(0);
  });

  it("falls back when env values are invalid", () => {
    vi.stubEnv("SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS", "-1");
    expect(getSessionLastUsedUpdateIntervalMs()).toBe(300_000);
    vi.stubEnv("NEXTAUTH_SESSION_MAX_AGE", "0");
    expect(getSessionMaxAgeMs()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
