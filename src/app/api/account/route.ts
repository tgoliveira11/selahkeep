import { secureAuth } from "@/lib/secure-auth";

export const GET = secureAuth.routes.account.GET;
export const DELETE = secureAuth.routes.account.DELETE;
