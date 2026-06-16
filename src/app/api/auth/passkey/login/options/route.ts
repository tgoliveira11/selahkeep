import { NextResponse } from "next/server";
import { secureAuth } from "@/lib/secure-auth";
import {
  optionsIncludePrf,
  passkeyLoginService,
} from "@/server/services/passkey-login-service";

type PasskeyLoginOptionsPost = (request: Request) => Promise<Response>;

export async function POST(request: Request) {
  const response = await (
    secureAuth.routes.passkeyLoginOptions.POST as PasskeyLoginOptionsPost
  )(request);
  if (!response.ok) return response;

  const body = (await response.json()) as { options?: unknown };
  return NextResponse.json({
    ...body,
    prfIncluded: optionsIncludePrf(body.options),
  });
}
