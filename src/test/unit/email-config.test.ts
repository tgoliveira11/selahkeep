import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  assertEmailDeliveryConfig,
  buildAccountLink,
  getEmailConfig,
  getSmtpConfig,
} from "@/server/email/config";

describe("email config", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("builds account links from app base url", () => {
    process.env.APP_BASE_URL = "http://localhost:3001";
    const link = buildAccountLink("/verify-email", "token-value");
    expect(link).toBe("http://localhost:3001/verify-email?token=token-value");
    expect(getEmailConfig().provider).toBeTruthy();
  });

  it("strips trailing slashes from app base url when building links", () => {
    process.env.APP_BASE_URL = "http://localhost:3001/";
    expect(buildAccountLink("/reset-password", "abc")).toBe(
      "http://localhost:3001/reset-password?token=abc"
    );
  });

  it("falls back to NEXTAUTH_URL for email config base url", () => {
    delete process.env.APP_BASE_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3001";
    expect(getEmailConfig().appBaseUrl).toBe("http://localhost:3001");
  });

  it("defaults SMTP_PORT to 587", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "pass";
    delete process.env.SMTP_PORT;
    expect(getSmtpConfig().port).toBe(587);
  });

  it("parses SMTP_PORT and SMTP_SECURE", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "pass";
    const config = getSmtpConfig();
    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
  });

  it("fails when SMTP_HOST is missing in smtp mode", () => {
    delete process.env.SMTP_HOST;
    expect(() => getSmtpConfig()).toThrow("SMTP_HOST is required");
  });

  it("accepts Mailpit config without SMTP_USER and SMTP_PASSWORD", () => {
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "1025";
    process.env.SMTP_SECURE = "false";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    const config = getSmtpConfig();
    expect(config.host).toBe("localhost");
    expect(config.port).toBe(1025);
    expect(config.secure).toBe(false);
    expect(config.user).toBeUndefined();
    expect(config.password).toBeUndefined();
  });

  it("requires credentials for non-local SMTP hosts", () => {
    process.env.SMTP_HOST = "smtp-relay.brevo.com";
    process.env.SMTP_PORT = "587";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    expect(() => getSmtpConfig()).toThrow("SMTP_USER and SMTP_PASSWORD are required");
  });

  it("requires EMAIL_FROM for non-console providers", () => {
    delete process.env.EMAIL_FROM;
    expect(() => assertEmailDeliveryConfig("smtp")).toThrow("EMAIL_FROM is required");
  });

  it("requires APP_BASE_URL for non-console providers", () => {
    process.env.EMAIL_FROM = "noreply@example.com";
    delete process.env.APP_BASE_URL;
    delete process.env.NEXTAUTH_URL;
    expect(() => assertEmailDeliveryConfig("smtp")).toThrow("APP_BASE_URL is required");
  });

  it("accepts NEXTAUTH_URL when APP_BASE_URL is unset for delivery config", () => {
    process.env.EMAIL_FROM = "noreply@example.com";
    delete process.env.APP_BASE_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3001";
    expect(() => assertEmailDeliveryConfig("smtp")).not.toThrow();
  });

  it("allows console provider without explicit delivery config", () => {
    delete process.env.EMAIL_FROM;
    delete process.env.APP_BASE_URL;
    expect(() => assertEmailDeliveryConfig("console")).not.toThrow();
  });

  it("rejects invalid SMTP_PORT values", () => {
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "0";
    expect(() => getSmtpConfig()).toThrow("SMTP_PORT must be a positive integer");
  });

  it("treats 127.0.0.1 as a local SMTP host without credentials", () => {
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = "1025";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    expect(getSmtpConfig().host).toBe("127.0.0.1");
  });
});
