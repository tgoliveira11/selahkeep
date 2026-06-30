import { secureAuth } from "@/lib/secure-auth";

export const GET = secureAuth.routes.adminLocks.GET;
export const POST = secureAuth.routes.adminLocks.POST;
