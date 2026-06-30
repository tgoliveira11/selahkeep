import { describe, expect, it } from "vitest";
import {
  AdminForbiddenError,
  isPlatformAdminUser,
  PLATFORM_ADMIN_EMAIL,
} from "@/lib/auth/require-platform-admin";

describe("require-platform-admin", () => {
  it("allows admin role", () => {
    expect(isPlatformAdminUser({ email: "other@example.com", role: "admin" })).toBe(true);
  });

  it("allows the platform admin email without admin role", () => {
    expect(isPlatformAdminUser({ email: PLATFORM_ADMIN_EMAIL, role: "user" })).toBe(true);
  });

  it("allows ADMIN_BOOTSTRAP_EMAIL without admin role", () => {
    expect(
      isPlatformAdminUser(
        { email: "bootstrap@example.com", role: "user" },
        { ADMIN_BOOTSTRAP_EMAIL: "bootstrap@example.com" }
      )
    ).toBe(true);
  });

  it("rejects non-admin users", () => {
    expect(isPlatformAdminUser({ email: "user@example.com", role: "user" })).toBe(false);
  });

  it("names forbidden errors for outpost admin handlers", () => {
    const error = new AdminForbiddenError();
    expect(error.name).toBe("AdminForbiddenError");
  });
});
