import "server-only";

import { createOutpost } from "@tgoliveira/outpost";
import {
  DrizzleApiKeyRepository,
  DrizzleAuditRepository,
  DrizzleConfigOverrideRepository,
  DrizzleOutboxRepository,
  DrizzleSuppressionRepository,
  DrizzleWebhookEventRepository,
} from "@tgoliveira/outpost/drizzle";
import { FakeEmailProvider, SmtpEmailProvider } from "@tgoliveira/outpost/adapters";
import type { EmailProvider as OutpostTransport } from "@tgoliveira/outpost";
import { outpostDb } from "@/lib/outpost-db";
import {
  buildOutpostEnvConfig,
  getSmtpConfig,
} from "@/lib/env/outpost-from-env";
import { getEmailConfig } from "@/modules/email/core/config";

function buildOutpostProviders(): OutpostTransport[] {
  const { provider, from } = getEmailConfig();

  if (provider === "smtp") {
    const smtp = getSmtpConfig();
    return [
      new SmtpEmailProvider({
        name: "smtp",
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        from,
        auth:
          smtp.user && smtp.password
            ? { user: smtp.user, pass: smtp.password }
            : undefined,
      }),
    ];
  }

  return [new FakeEmailProvider("console")];
}

let outpostInstance: ReturnType<typeof createOutpost> | null = null;

export function getOutpost() {
  if (!outpostInstance) {
    const config = buildOutpostEnvConfig(process.env);
    outpostInstance = createOutpost({
      repositories: {
        outbox: new DrizzleOutboxRepository(outpostDb),
        suppressions: new DrizzleSuppressionRepository(outpostDb),
        audit: new DrizzleAuditRepository(outpostDb),
        apiKeys: new DrizzleApiKeyRepository(outpostDb),
        webhookEvents: new DrizzleWebhookEventRepository(outpostDb),
      },
      providers: buildOutpostProviders(),
      recipientHmacKey: config.recipientHmacKey,
    });
  }
  return outpostInstance;
}

export function getOutpostConfigOverrideRepository() {
  return new DrizzleConfigOverrideRepository(outpostDb);
}
