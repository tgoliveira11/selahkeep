import { secureAuth } from "@/lib/secure-auth";

/** Account passkey sign-in only. Vault unlock is a separate product ceremony. */
export const POST = secureAuth.routes.passkeyLoginOptions.POST;
