import { secureAuth } from "@/lib/secure-auth";

export const GET = secureAuth.routes.adminConfig.GET;
export const POST = secureAuth.routes.adminConfig.POST;
export const DELETE = secureAuth.routes.adminConfig.DELETE;
