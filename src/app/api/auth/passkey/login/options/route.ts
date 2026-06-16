import { NextResponse } from "next/server";
import { secureAuth } from "@/lib/secure-auth";
import {
  optionsIncludePrf,
  passkeyLoginVaultService,
} from "@/server/services/passkey-login-vault-service";

type PasskeyLoginOptionsPost = (request: Request) => Promise<Response>;

type PasskeyLoginOptionsPayload = {
  email?: string;
  userId?: string;
  credentialId?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as PasskeyLoginOptionsPayload;
  const packageRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(payload),
  });

  const response = await (
    secureAuth.routes.passkeyLoginOptions.POST as PasskeyLoginOptionsPost
  )(packageRequest);
  if (!response.ok) return response;

  const body = (await response.json()) as {
    options: Parameters<typeof passkeyLoginVaultService.enrichLoginOptionsWithVaultPrf>[1];
  };
  const options = await passkeyLoginVaultService.enrichLoginOptionsWithVaultPrf(
    payload,
    body.options
  );

  return NextResponse.json({
    ...body,
    options,
    prfIncluded: optionsIncludePrf(options),
  });
}
