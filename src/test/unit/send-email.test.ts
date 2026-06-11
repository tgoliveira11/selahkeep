import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeLogger } from "@/lib/logger";
import { sendEmail } from "@/server/email/send-email";
import * as smtpProvider from "@/modules/email/core/smtp-provider";

vi.mock("@/lib/logger", () => ({
  safeLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/modules/email/core/smtp-provider", () => ({
  sendSmtpEmail: vi.fn().mockResolvedValue(undefined),
  resetSmtpTransportCache: vi.fn(),
  createSmtpTransport: vi.fn(),
}));

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("EMAIL_FROM", "noreply@localhost");
    vi.stubEnv("APP_BASE_URL", "http://localhost:3001");
  });

  describe("console adapter", () => {
    beforeEach(() => {
      vi.stubEnv("EMAIL_PROVIDER", "console");
      vi.stubEnv("NODE_ENV", "test");
    });

    it("does not throw for console provider", async () => {
      await expect(
        sendEmail({
          to: "user@example.com",
          subject: "Test",
          html: "<p>Hello</p>",
          text: "Hello https://example.com/verify-email?token=secret",
        })
      ).resolves.toBeUndefined();
    });

    it("logs dev links only outside production", async () => {
      vi.stubEnv("NODE_ENV", "development");
      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        text: "Hello https://example.com/verify-email?token=secret",
      });
      expect(safeLogger.info).toHaveBeenCalledWith(
        "Dev account email link (do not use in production logs)",
        expect.objectContaining({ url: expect.stringContaining("verify-email") })
      );
    });

    it("does not log dev links in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("EMAIL_PROVIDER", "console");
      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        text: "Hello https://example.com/verify-email?token=secret",
      });
      expect(safeLogger.info).not.toHaveBeenCalledWith(
        "Dev account email link (do not use in production logs)",
        expect.anything()
      );
    });

    it("warns when console provider is used in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("EMAIL_PROVIDER", "console");
      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        text: "Hello",
      });
      expect(safeLogger.warn).toHaveBeenCalledWith(
        "EMAIL_PROVIDER=console in production — emails are not delivered",
        expect.any(Object)
      );
    });
  });

  describe("smtp adapter", () => {
    beforeEach(() => {
      vi.stubEnv("EMAIL_PROVIDER", "smtp");
      vi.stubEnv("SMTP_HOST", "localhost");
      vi.stubEnv("SMTP_PORT", "1025");
      vi.stubEnv("SMTP_SECURE", "false");
      vi.stubEnv("EMAIL_FROM", "Letters to God <noreply@localhost>");
      vi.stubEnv("NODE_ENV", "production");
    });

    it("delegates to SMTP provider with expected payload", async () => {
      const input = {
        to: "user@example.com",
        subject: "Verify your email",
        html: "<p>Verify</p>",
        text: "Verify https://example.com/verify-email?token=opaque",
      };
      await sendEmail(input);
      expect(smtpProvider.sendSmtpEmail).toHaveBeenCalledWith(
        "Letters to God <noreply@localhost>",
        input
      );
    });

    it("does not log email body or tokens via console adapter in smtp mode", async () => {
      await sendEmail({
        to: "user@example.com",
        subject: "Reset",
        html: "<p>secret-body</p>",
        text: "secret https://example.com/reset-password?token=opaque-token",
      });
      expect(safeLogger.info).not.toHaveBeenCalledWith(
        "Dev account email link (do not use in production logs)",
        expect.anything()
      );
      expect(safeLogger.info).not.toHaveBeenCalledWith(
        "Dev email (console adapter)",
        expect.anything()
      );
    });
  });

  it("rejects unknown providers", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "unknown-provider");
    await expect(
      sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        text: "Hello",
      })
    ).rejects.toThrow("Unsupported EMAIL_PROVIDER");
  });

  it("rejects unimplemented resend provider", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    await expect(
      sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        text: "Hello",
      })
    ).rejects.toThrow("not implemented");
  });
});
