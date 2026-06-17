import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeLogger } from "@/lib/logger";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

vi.mock("@/lib/logger", () => ({
  safeLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  createSmtpTransport,
  resetSmtpTransportCache,
  sendSmtpEmail,
} from "@/server/email/smtp-provider";

describe("smtp provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSmtpTransportCache();
    vi.stubEnv("SMTP_HOST", "localhost");
    vi.stubEnv("SMTP_PORT", "1025");
    vi.stubEnv("SMTP_SECURE", "false");
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
  });

  it("creates transport with Mailpit settings and no auth", () => {
    createSmtpTransport();
    expect(createTransport).toHaveBeenCalledWith({
      host: "localhost",
      port: 1025,
      secure: false,
      auth: undefined,
    });
  });

  it("creates transport with credentials for remote hosts", () => {
    vi.stubEnv("SMTP_HOST", "smtp-relay.brevo.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "login");
    vi.stubEnv("SMTP_PASSWORD", "secret");
    createSmtpTransport();
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: "login", pass: "secret" },
    });
  });

  it("sends mail with expected fields", async () => {
    const transport = { sendMail } as never;
    await sendSmtpEmail(
      "SelahKeep <noreply@localhost>",
      {
        to: "user@example.com",
        subject: "Verify your email",
        html: "<p>link</p>",
        text: "link https://localhost:3001/verify-email?token=opaque",
      },
      transport
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: "SelahKeep <noreply@localhost>",
      to: "user@example.com",
      subject: "Verify your email",
      html: "<p>link</p>",
      text: "link https://localhost:3001/verify-email?token=opaque",
    });
  });

  it("reuses cached transport when no explicit transport is passed", async () => {
    await sendSmtpEmail("noreply@localhost", {
      to: "a@example.com",
      subject: "One",
      html: "<p>1</p>",
      text: "1",
    });
    await sendSmtpEmail("noreply@localhost", {
      to: "b@example.com",
      subject: "Two",
      html: "<p>2</p>",
      text: "2",
    });
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("logs only domain and subject, not body or token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const transport = { sendMail } as never;
    await sendSmtpEmail(
      "noreply@localhost",
      {
        to: "user@example.com",
        subject: "Reset password",
        html: "<p>secret-html</p>",
        text: "secret https://localhost/reset-password?token=raw-token",
      },
      transport
    );
    expect(safeLogger.info).toHaveBeenCalledWith("Email sent via SMTP", {
      toDomain: "example.com",
      subject: "Reset password",
    });
    const logged = JSON.stringify(vi.mocked(safeLogger.info).mock.calls);
    expect(logged).not.toContain("raw-token");
    expect(logged).not.toContain("secret-html");
  });
});
