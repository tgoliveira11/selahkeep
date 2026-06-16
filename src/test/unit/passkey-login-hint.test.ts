/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearPasskeyLoginHint,
  getPasskeyLoginHint,
  setPasskeyLoginHint,
} from "@/lib/passkey/login-hint";
import { USER_ID } from "@/test/helpers/fixtures";

describe("passkey login hint", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (name) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    }
    clearPasskeyLoginHint();
  });

  it("stores and reads userId with optional credentialId", () => {
    setPasskeyLoginHint({ userId: USER_ID, credentialId: "cred-id" });
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID, credentialId: "cred-id" });
  });

  it("reads credentialId from cookies when localStorage is empty", () => {
    setPasskeyLoginHint({ credentialId: "cred-from-cookie" });
    localStorage.removeItem("letters-to-god-passkey-login-credential-id");
    expect(getPasskeyLoginHint()).toEqual({ credentialId: "cred-from-cookie" });
  });

  it("clears stored hint from localStorage and cookies", () => {
    setPasskeyLoginHint({ userId: USER_ID, credentialId: "cred-id" });
    clearPasskeyLoginHint();
    expect(getPasskeyLoginHint()).toBeNull();
    expect(document.cookie).not.toContain("letters-to-god-passkey-login-credential-id=");
  });

  it("stores userId without credentialId", () => {
    setPasskeyLoginHint({ userId: USER_ID });
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID });
  });

  it("reads userId from cookies when localStorage is empty", () => {
    setPasskeyLoginHint({ userId: USER_ID });
    localStorage.removeItem("letters-to-god-passkey-login-user-id");
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID });
  });

  it("clears userId when updating hint without userId", () => {
    setPasskeyLoginHint({ userId: USER_ID, credentialId: "cred-id" });
    setPasskeyLoginHint({ credentialId: "cred-only" });
    expect(getPasskeyLoginHint()).toEqual({ credentialId: "cred-only" });
  });

  it("ignores empty cookie values", () => {
    document.cookie = "letters-to-god-passkey-login-user-id=; path=/";
    expect(getPasskeyLoginHint()).toBeNull();
  });

  it("skips legacy migration when slug hint already exists", () => {
    setPasskeyLoginHint({ userId: USER_ID });
    localStorage.setItem("letters-passkey-login-credential-id", "should-not-migrate");
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID });
    expect(localStorage.getItem("letters-passkey-login-credential-id")).toBe("should-not-migrate");
  });

  it("migrates legacy hint keys to the secure-auth slug format", () => {
    localStorage.setItem("letters-passkey-login-user-id", USER_ID);
    localStorage.setItem("letters-passkey-login-credential-id", "legacy-cred");
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID, credentialId: "legacy-cred" });
    expect(localStorage.getItem("letters-passkey-login-user-id")).toBeNull();
    expect(localStorage.getItem("letters-to-god-passkey-login-user-id")).toBe(USER_ID);
  });

  it("ignores empty legacy cookie values during migration", () => {
    document.cookie = "letters-passkey-login-user-id=; path=/";
    document.cookie = `letters-passkey-login-credential-id=${encodeURIComponent("cookie-cred")}; path=/`;
    expect(getPasskeyLoginHint()).toEqual({ credentialId: "cookie-cred" });
  });

  it("migrates legacy hints stored only in cookies", () => {
    document.cookie = `letters-passkey-login-user-id=${encodeURIComponent(USER_ID)}; path=/`;
    document.cookie = `letters-passkey-login-credential-id=${encodeURIComponent("cookie-cred")}; path=/`;
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID, credentialId: "cookie-cred" });
  });
});
