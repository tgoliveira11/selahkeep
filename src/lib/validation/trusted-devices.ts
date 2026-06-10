import { z } from "zod";
import { encryptedPayloadSchema } from "./encrypted-payload";

export const createTrustedDeviceSchema = z.object({
  deviceName: z.string().min(1).max(200),
  devicePublicKey: z.record(z.unknown()).optional(),
  browser: z.string().optional(),
  platform: z.string().optional(),
  encryptedVaultKey: encryptedPayloadSchema,
});

export type CreateTrustedDeviceInput = z.infer<typeof createTrustedDeviceSchema>;
