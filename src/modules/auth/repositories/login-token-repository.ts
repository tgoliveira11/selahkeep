import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userTwoFactorLoginTokens } from "@/lib/db/schema";

/** Read-only access to package-issued login tokens for product vault flows. */
export const loginTokenRepository = {
  async findValidLoginToken(tokenHash: string) {
    const now = new Date();
    const [row] = await db
      .select()
      .from(userTwoFactorLoginTokens)
      .where(
        and(
          eq(userTwoFactorLoginTokens.tokenHash, tokenHash),
          isNull(userTwoFactorLoginTokens.consumedAt),
          gt(userTwoFactorLoginTokens.expiresAt, now)
        )
      )
      .limit(1);
    return row ?? null;
  },
};
