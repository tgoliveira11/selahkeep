import { safeLogger } from "@/lib/logger";
import { assertEmailDeliveryConfig, getEmailConfig, type EmailProvider } from "./config";
import { sendSmtpEmail } from "./smtp-provider";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { provider, from } = getEmailConfig();
  assertEmailDeliveryConfig(provider);

  switch (provider as EmailProvider) {
    case "console":
      await sendConsoleEmail(from, input);
      return;
    case "smtp":
      await sendSmtpEmail(from, input);
      return;
    case "resend":
    case "sendgrid":
      throw new Error(
        `EMAIL_PROVIDER=${provider} is not implemented yet. Use EMAIL_PROVIDER=smtp or console.`
      );
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
}

async function sendConsoleEmail(from: string, input: SendEmailInput): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.EMAIL_PROVIDER === "console") {
    safeLogger.warn("EMAIL_PROVIDER=console in production — emails are not delivered", {
      toDomain: input.to.split("@")[1] ?? "unknown",
      subject: input.subject,
    });
  }

  safeLogger.info("Dev email (console adapter)", {
    from,
    toDomain: input.to.split("@")[1] ?? "unknown",
    subject: input.subject,
  });

  if (process.env.NODE_ENV !== "production") {
    const linkMatch = input.text.match(/https?:\/\/\S+/);
    if (linkMatch) {
      safeLogger.info("Dev account email link (do not use in production logs)", {
        url: linkMatch[0],
      });
    }
  }
}
