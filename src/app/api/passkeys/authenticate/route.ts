import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { passkeyService } from "@/server/services/passkey-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { z } from "zod";

const authSchema = z.object({
  action: z.enum(["options", "verify"]),
  response: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    const parsed = authSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (parsed.data.action === "options") {
      const options = await passkeyService.getAuthenticationOptions(user.id);
      return NextResponse.json(options);
    }

    if (!parsed.data.response) {
      return NextResponse.json({ error: "Missing authentication response" }, { status: 400 });
    }

    const result = await passkeyService.verifyAuthentication(
      user.id,
      parsed.data.response as Parameters<typeof passkeyService.verifyAuthentication>[1]
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/passkeys/authenticate");
  }
}
