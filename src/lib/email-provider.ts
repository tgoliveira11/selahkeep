import type { EmailProvider } from "@tgoliveira/secure-auth/email";
import { sendEmail } from "@/modules/email/core/send-email";

export const emailProvider: EmailProvider = {
  async send({ to, subject, html, text }) {
    await sendEmail({
      to,
      subject,
      html,
      text: text ?? "",
    });
  },
};
