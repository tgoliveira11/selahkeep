import { ACCOUNT_PASSWORD_VAULT_NOTE } from "@/lib/account-auth-messages";
import { buildAccountLink } from "../core/config";

export function verificationEmailContent(token: string) {
  const link = buildAccountLink("/verify-email", token);
  return {
    subject: "Verify your email — Letters to God",
    text: [
      "Please verify your email address to finish setting up your account.",
      "",
      link,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>Please verify your email address to finish setting up your account.</p>",
      `<p><a href="${link}">Verify your email</a></p>`,
      "<p>If you did not create this account, you can ignore this email.</p>",
    ].join(""),
  };
}

export function passwordResetEmailContent(token: string) {
  const link = buildAccountLink("/reset-password", token);
  return {
    subject: "Reset your password — Letters to God",
    text: [
      "We received a request to reset your account password.",
      "",
      link,
      "",
      ACCOUNT_PASSWORD_VAULT_NOTE,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>We received a request to reset your account password.</p>",
      `<p><a href="${link}">Reset your password</a></p>`,
      `<p>${ACCOUNT_PASSWORD_VAULT_NOTE}</p>`,
      "<p>If you did not request this, you can ignore this email.</p>",
    ].join(""),
  };
}

