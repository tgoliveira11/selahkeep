import { secureAuth } from "@/lib/secure-auth";

export const GET = secureAuth.routes.nextAuth.GET;
export const POST = secureAuth.routes.nextAuth.POST;
