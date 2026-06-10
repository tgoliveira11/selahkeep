import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { vaultInitSchema } from "@/lib/validation/vault";
import { vaultService } from "@/server/services/vault-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    const parsed = vaultInitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid vault init payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const vault = await vaultService.init(user.id, parsed.data);
    return NextResponse.json(vault, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/vault/init");
  }
}
