import { NextResponse } from "next/server";
import { secureAuth } from "@/lib/secure-auth";
import { passkeyLoginService } from "@/server/services/passkey-login-service";

type PasskeyLoginVerifyPost = (request: Request) => Promise<Response>;

export async function POST(request: Request) {
  const response = await (
    secureAuth.routes.passkeyLoginVerify.POST as PasskeyLoginVerifyPost
  )(request);
  if (!response.ok) return response;

  const body = (await response.json()) as {
    loginToken: string;
    userId: string;
    credentialId: string;
  };

  const vaultMetadata = await passkeyLoginService.getVaultUnlockMetadataForCredential(
    body.userId,
    body.credentialId
  );

  return NextResponse.json({
    ...body,
    ...vaultMetadata,
  });
}
