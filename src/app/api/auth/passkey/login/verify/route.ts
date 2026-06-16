import { NextResponse } from "next/server";
import { secureAuth } from "@/lib/secure-auth";
import { passkeyLoginService } from "@/server/services/passkey-login-service";

type PasskeyLoginVerifyPost = (request: Request) => Promise<Response>;

type PasskeyLoginVerifyPackageBody = {
  loginToken?: string;
  requiresTwoFactor?: boolean;
  challengeToken?: string;
  userId: string;
  credentialId: string;
};

async function resolvePasskeyLoginToken(body: PasskeyLoginVerifyPackageBody): Promise<{
  loginToken: string;
  userId: string;
  credentialId: string;
}> {
  if (body.loginToken) {
    return {
      loginToken: body.loginToken,
      userId: body.userId,
      credentialId: body.credentialId,
    };
  }

  if (body.requiresTwoFactor && body.userId && body.credentialId) {
    const services = await secureAuth.getServices();
    const loginToken = await services.authLoginService.issueLoginToken(body.userId, "passkey");
    await services.authService.recordLoginSuccess(body.userId, "passkey");
    return { loginToken, userId: body.userId, credentialId: body.credentialId };
  }

  throw new Error("Passkey verify succeeded but no login token was issued.");
}

export async function POST(request: Request) {
  const response = await (
    secureAuth.routes.passkeyLoginVerify.POST as PasskeyLoginVerifyPost
  )(request);
  if (!response.ok) return response;

  const body = (await response.json()) as PasskeyLoginVerifyPackageBody;

  let loginResult: { loginToken: string; userId: string; credentialId: string };
  try {
    loginResult = await resolvePasskeyLoginToken(body);
  } catch {
    return NextResponse.json({ error: "Passkey sign-in could not complete." }, { status: 500 });
  }

  const vaultMetadata = await passkeyLoginService.getVaultUnlockMetadataForCredential(
    loginResult.userId,
    loginResult.credentialId
  );

  return NextResponse.json({
    ...loginResult,
    ...vaultMetadata,
  });
}
