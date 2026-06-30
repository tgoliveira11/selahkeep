import { describe, expect, it, vi, beforeEach } from "vitest";

const { updateMock } = vi.hoisted(() => ({
  updateMock: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  })),
}));

vi.mock("@/lib/secure-auth-db", () => ({
  secureAuthDb: {
    update: updateMock,
  },
}));

import {
  ensureBootstrapEmailAdminRole,
  readAdminBootstrapEmail,
} from "@/lib/secure-auth-admin-bootstrap";

describe("secure-auth-admin-bootstrap", () => {
  beforeEach(() => {
    updateMock.mockClear();
  });

  it("reads ADMIN_BOOTSTRAP_EMAIL case-insensitively", () => {
    expect(
      readAdminBootstrapEmail({ ADMIN_BOOTSTRAP_EMAIL: "  Admin@Example.COM  " })
    ).toBe("admin@example.com");
  });

  it("promotes bootstrap email to admin when admin is enabled", async () => {
    await ensureBootstrapEmailAdminRole({
      AUTH_ADMIN_ENABLED: "true",
      ADMIN_BOOTSTRAP_EMAIL: "tgoliveira11@gmail.com",
    });

    expect(updateMock).toHaveBeenCalledOnce();
  });

  it("skips promotion when admin platform is disabled", async () => {
    await ensureBootstrapEmailAdminRole({
      AUTH_ADMIN_ENABLED: "false",
      ADMIN_BOOTSTRAP_EMAIL: "tgoliveira11@gmail.com",
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("skips promotion when bootstrap email is unset", async () => {
    await ensureBootstrapEmailAdminRole({
      AUTH_ADMIN_ENABLED: "true",
    });

    expect(updateMock).not.toHaveBeenCalled();
  });
});
