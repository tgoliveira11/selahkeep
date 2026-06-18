import { describe, it, expect } from "vitest";
import {
  isFullyAuthenticatedSession,
  isPendingTwoFactorSession,
} from "@/lib/auth/session-state";

describe("session-state", () => {
  describe("isPendingTwoFactorSession", () => {
    it("returns false for null or missing user", () => {
      expect(isPendingTwoFactorSession(null)).toBe(false);
      expect(isPendingTwoFactorSession(undefined)).toBe(false);
      expect(isPendingTwoFactorSession({ user: null })).toBe(false);
      expect(isPendingTwoFactorSession({ user: {} })).toBe(false);
    });

    it("returns true when twoFactorPending is true", () => {
      expect(
        isPendingTwoFactorSession({
          user: { id: "user-1" },
          twoFactorPending: true,
          twoFactorVerified: false,
        })
      ).toBe(true);
    });

    it("returns true when twoFactorVerified is false", () => {
      expect(
        isPendingTwoFactorSession({
          user: { id: "user-1" },
          twoFactorPending: false,
          twoFactorVerified: false,
        })
      ).toBe(true);
    });

    it("returns false for fully verified sessions", () => {
      expect(
        isPendingTwoFactorSession({
          user: { id: "user-1" },
          twoFactorPending: false,
          twoFactorVerified: true,
        })
      ).toBe(false);
    });

    it("returns false when 2FA flags are unset (verified by default)", () => {
      expect(
        isPendingTwoFactorSession({
          user: { id: "user-1" },
        })
      ).toBe(false);
    });
  });

  describe("isFullyAuthenticatedSession", () => {
    it("returns false for null or missing user", () => {
      expect(isFullyAuthenticatedSession(null)).toBe(false);
      expect(isFullyAuthenticatedSession({ user: null })).toBe(false);
    });

    it("returns false when twoFactorPending is true", () => {
      expect(
        isFullyAuthenticatedSession({
          user: { id: "user-1" },
          twoFactorPending: true,
          twoFactorVerified: false,
        })
      ).toBe(false);
    });

    it("returns false when twoFactorVerified is false", () => {
      expect(
        isFullyAuthenticatedSession({
          user: { id: "user-1" },
          twoFactorVerified: false,
        })
      ).toBe(false);
    });

    it("returns true for verified sessions", () => {
      expect(
        isFullyAuthenticatedSession({
          user: { id: "user-1" },
          twoFactorPending: false,
          twoFactorVerified: true,
        })
      ).toBe(true);
    });

    it("returns true when 2FA flags are unset", () => {
      expect(
        isFullyAuthenticatedSession({
          user: { id: "user-1" },
        })
      ).toBe(true);
    });
  });
});
