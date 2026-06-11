import { z } from "zod";

export const totpCodeSchema = z.string().regex(/^\d{6}$/, "Enter a 6-digit code");

export const twoFactorVerifySchema = z
  .object({
    code: totpCodeSchema.optional(),
    backupCode: z.string().min(8).max(32).optional(),
  })
  .refine((value) => Boolean(value.code || value.backupCode), {
    message: "Authenticator code or backup code is required",
  });

export const twoFactorLoginVerifySchema = z
  .object({
    challengeToken: z.string().min(16),
    code: totpCodeSchema.optional(),
    backupCode: z.string().min(8).max(32).optional(),
  })
  .refine((value) => Boolean(value.code || value.backupCode), {
    message: "Authenticator code or backup code is required",
  });

export const credentialsLoginStartSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
