import { getOutpostAdmin } from "@/lib/outpost-admin";

export const GET = getOutpostAdmin().routes.adminConfig.GET;
export const POST = getOutpostAdmin().routes.adminConfig.POST;
export const DELETE = getOutpostAdmin().routes.adminConfig.DELETE;
