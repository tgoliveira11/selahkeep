import { z } from "zod";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";

export const INTEGRATION_TYPES = ["mcp"] as const;
export const INTEGRATION_RESOURCE_TYPES = ["note", "kanban_board"] as const;
export const INTEGRATION_PERMISSIONS = ["read", "write"] as const;

export const PLAINTEXT_FORBIDDEN_INTEGRATION_FIELDS = [
  "integrationKey",
  "iek",
  "userVaultKey",
  "noteKey",
  "token",
  "title",
  "body",
  "board",
  "cards",
] as const;

export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(INTEGRATION_TYPES).default("mcp"),
});

export const integrationGrantItemSchema = z.object({
  resourceType: z.enum(INTEGRATION_RESOURCE_TYPES),
  resourceId: z.string().uuid(),
  permissions: z.enum(INTEGRATION_PERMISSIONS),
  encryptedWrappedKey: encryptedPayloadSchema,
});

export const upsertIntegrationGrantsSchema = z.object({
  grants: z.array(integrationGrantItemSchema).min(1).max(200),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type IntegrationGrantItem = z.infer<typeof integrationGrantItemSchema>;
export type UpsertIntegrationGrantsInput = z.infer<typeof upsertIntegrationGrantsSchema>;

export class IntegrationPlaintextRejectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationPlaintextRejectionError";
  }
}

export function assertNoIntegrationPlaintextFields(body: Record<string, unknown>): void {
  for (const key of PLAINTEXT_FORBIDDEN_INTEGRATION_FIELDS) {
    if (key in body && body[key] !== undefined) {
      throw new IntegrationPlaintextRejectionError(`Plaintext field "${key}" is not allowed`);
    }
  }
}

export function assertIntegrationGrantAad(
  userId: string,
  integrationId: string,
  resourceId: string,
  payload: z.infer<typeof encryptedPayloadSchema>
): void {
  if (payload.aad.userId !== userId) {
    throw new Error("Grant AAD userId mismatch");
  }
  if (payload.aad.resourceId !== resourceId) {
    throw new Error("Grant AAD resourceId mismatch");
  }
  if (payload.aad.field !== "integration_grant") {
    throw new Error("Grant AAD field must be integration_grant");
  }
  if (payload.aad.integrationId !== integrationId) {
    throw new Error("Grant AAD integrationId mismatch");
  }
}
