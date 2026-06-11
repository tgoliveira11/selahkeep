import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSmtpConfig, type SmtpConfig } from "./config";
import { safeLogger } from "@/lib/logger";
import type { SendEmailInput } from "./send-email";

let cachedTransport: Transporter | null = null;

export function resetSmtpTransportCache(): void {
  cachedTransport = null;
}

export function createSmtpTransport(config: SmtpConfig = getSmtpConfig()): Transporter {
  const auth =
    config.user && config.password ? { user: config.user, pass: config.password } : undefined;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
  });
}

function getOrCreateTransport(): Transporter {
  if (!cachedTransport) {
    cachedTransport = createSmtpTransport();
  }
  return cachedTransport;
}

export async function sendSmtpEmail(
  from: string,
  input: SendEmailInput,
  transport?: Transporter
): Promise<void> {
  const transporter = transport ?? getOrCreateTransport();
  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  safeLogger.info("Email sent via SMTP", {
    toDomain: input.to.split("@")[1] ?? "unknown",
    subject: input.subject,
  });
}
