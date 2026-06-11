export type EmailProvider = "console" | "smtp" | "resend" | "sendgrid";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
};

function isLocalSmtpHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1";
}

export function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER ?? "console") as EmailProvider;
  const from = process.env.EMAIL_FROM ?? "noreply@localhost";
  const appBaseUrl =
    process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  return { provider, from, appBaseUrl };
}

export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    throw new Error("SMTP_HOST is required when EMAIL_PROVIDER=smtp");
  }

  const portRaw = process.env.SMTP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : 587;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive integer");
  }

  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER?.trim() || undefined;
  const password = process.env.SMTP_PASSWORD?.trim() || undefined;

  if (!isLocalSmtpHost(host) && (!user || !password)) {
    throw new Error(
      "SMTP_USER and SMTP_PASSWORD are required for non-local SMTP hosts when EMAIL_PROVIDER=smtp"
    );
  }

  return { host, port, secure, user, password };
}

export function assertEmailDeliveryConfig(provider: EmailProvider): void {
  if (provider === "console") {
    return;
  }

  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new Error("EMAIL_FROM is required when EMAIL_PROVIDER is not console");
  }

  const appBaseUrl = process.env.APP_BASE_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!appBaseUrl) {
    throw new Error("APP_BASE_URL is required when EMAIL_PROVIDER is not console");
  }
}

export function buildAccountLink(path: string, token: string): string {
  const { appBaseUrl } = getEmailConfig();
  const base = appBaseUrl.replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
