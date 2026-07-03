import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { passkeyVaultEnvelopeService } from "@/server/services/passkey-vault-envelope-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { rejectPasskeyVaultForbiddenFields } from "@/server/policies/passkey-vault-plaintext-rejection";
import {
  clearVaultDeviceBindingCookie,
  readVaultDeviceBindingIdFromCookies,
} from "@/lib/passkey/vault-device-binding-cookie";

type RouteContext = { params: Promise<{ id: string }> };

const postBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("disable-options") }),
  z.object({
    action: z.literal("disable-verify"),
    response: z.unknown(),
    prfVaultEnvelope: z.literal(true),
  }),
]);

const deleteBodySchema = z.object({
  response: z.unknown(),
  prfVaultEnvelope: z.literal(true),
});

async function respondAfterDisable(result: { success: boolean; removedBindingId?: string | null }) {
  const response = NextResponse.json(result);
  const cookieBindingId = await readVaultDeviceBindingIdFromCookies();
  if (result.removedBindingId && cookieBindingId === result.removedBindingId) {
    clearVaultDeviceBindingCookie(response);
  }
  return response;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id } = await context.params;
    const status = await passkeyVaultEnvelopeService.getVaultUnlockStatus(user.id, id);
    return NextResponse.json(status);
  } catch (error) {
    return apiError(error, "GET /api/account/passkeys/:id/vault-unlock");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id } = await context.params;
    const body = await parseJsonBody(request);
    const plaintextError = rejectPasskeyVaultForbiddenFields(body);
    if (plaintextError) {
      return NextResponse.json({ error: plaintextError }, { status: 400 });
    }
    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);

    if (parsed.data.action === "disable-options") {
      const options = await passkeyVaultEnvelopeService.getManageVaultUnlockAuthOptions(
        user.id,
        id,
        ip
      );
      return NextResponse.json(options);
    }

    const result = await passkeyVaultEnvelopeService.disableVaultUnlockWithProof(
      user.id,
      id,
      parsed.data.response as AuthenticationResponseJSON
    );
    return respondAfterDisable(result);
  } catch (error) {
    return apiError(error, "POST /api/account/passkeys/:id/vault-unlock");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id } = await context.params;
    const body = await parseJsonBody(request);
    const plaintextError = rejectPasskeyVaultForbiddenFields(body);
    if (plaintextError) {
      return NextResponse.json({ error: plaintextError }, { status: 400 });
    }
    const parsed = deleteBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "PRF ceremony proof is required to disable passkey vault unlock. Complete a passkey authentication with PRF output first.",
        },
        { status: 400 }
      );
    }

    const result = await passkeyVaultEnvelopeService.disableVaultUnlockWithProof(
      user.id,
      id,
      parsed.data.response as AuthenticationResponseJSON
    );
    return respondAfterDisable(result);
  } catch (error) {
    return apiError(error, "DELETE /api/account/passkeys/:id/vault-unlock");
  }
}
