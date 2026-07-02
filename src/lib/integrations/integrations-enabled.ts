import { readBoolEnv } from "@/lib/env/parse";

export function integrationsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readBoolEnv(env, "INTEGRATIONS_ENABLED", false);
}

export class IntegrationsDisabledError extends Error {
  constructor() {
    super("Integrations are not enabled");
    this.name = "IntegrationsDisabledError";
  }
}

export function assertIntegrationsEnabled(env: NodeJS.ProcessEnv = process.env): void {
  if (!integrationsEnabled(env)) {
    throw new IntegrationsDisabledError();
  }
}
