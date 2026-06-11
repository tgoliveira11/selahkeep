import { describe, it, expect } from "vitest";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  stripPasswordFields,
  AuthPasswordTransportError,
} from "@/server/policies/auth-password-input";

describe("auth password input policy", () => {
  it("rejects passwords in query strings", () => {
    expect(() =>
      assertPasswordNotInUrl("https://localhost/api/auth/register?password=secret")
    ).toThrow(AuthPasswordTransportError);
    expect(() =>
      assertPasswordNotInUrl("https://localhost/api/account?reenterPassword=secret")
    ).toThrow(AuthPasswordTransportError);
  });

  it("allows URLs without password query keys", () => {
    expect(() =>
      assertPasswordNotInUrl("https://localhost/api/auth/register?email=user@example.com")
    ).not.toThrow();
  });

  it("restricts password-bearing auth routes to approved methods", () => {
    expect(() =>
      assertAuthPasswordRequestMethod("GET", new Set(["POST"]))
    ).toThrow(AuthPasswordTransportError);
    expect(() =>
      assertAuthPasswordRequestMethod("POST", new Set(["POST"]))
    ).not.toThrow();
  });

  it("strips password fields from API response objects", () => {
    expect(
      stripPasswordFields({
        id: "user-1",
        email: "user@example.com",
        password: "secret",
        passwordHash: "$2b$12$hash",
      })
    ).toEqual({ id: "user-1", email: "user@example.com" });
  });
});
