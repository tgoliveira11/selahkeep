import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { base64UrlToBytes, toBufferSource } from "@/lib/crypto-client/encoding";

type PrfEvalInput = {
  first?: string | ArrayBuffer;
  second?: string | ArrayBuffer;
};

type PrfExtensionInput = {
  eval?: PrfEvalInput;
  evalByCredential?: Record<string, PrfEvalInput>;
};

function toArrayBuffer(value: string | ArrayBuffer): ArrayBuffer {
  if (value instanceof ArrayBuffer) {
    return toBufferSource(new Uint8Array(value)).buffer;
  }
  return toBufferSource(base64UrlToBytes(value)).buffer;
}

function convertPrfEval(evalInput: PrfEvalInput): PrfEvalInput {
  const converted: PrfEvalInput = {};
  if (evalInput.first !== undefined) {
    converted.first = toArrayBuffer(evalInput.first);
  }
  if (evalInput.second !== undefined) {
    converted.second = toArrayBuffer(evalInput.second);
  }
  return converted;
}

/** Converts server JSON WebAuthn options so PRF salts are ArrayBuffers for the browser API. */
export function prepareWebAuthnExtensions<T extends { prf?: PrfExtensionInput } | undefined>(
  extensions: T
): T {
  if (!extensions?.prf) return extensions;

  const prf = extensions.prf;
  const prepared: PrfExtensionInput = { ...prf };

  if (prf.eval) {
    prepared.eval = convertPrfEval(prf.eval);
  }

  if (prf.evalByCredential) {
    prepared.evalByCredential = Object.fromEntries(
      Object.entries(prf.evalByCredential).map(([credentialId, evalInput]) => [
        credentialId,
        convertPrfEval(evalInput),
      ])
    );
  }

  return { ...extensions, prf: prepared };
}

export function prepareRegistrationOptions(
  options: PublicKeyCredentialCreationOptionsJSON
): PublicKeyCredentialCreationOptionsJSON {
  if (!options.extensions) return options;
  return {
    ...options,
    extensions: prepareWebAuthnExtensions(
      options.extensions as { prf?: PrfExtensionInput }
    ) as PublicKeyCredentialCreationOptionsJSON["extensions"],
  };
}

export function prepareAuthenticationOptions(
  options: PublicKeyCredentialRequestOptionsJSON
): PublicKeyCredentialRequestOptionsJSON {
  if (!options.extensions) return options;
  return {
    ...options,
    extensions: prepareWebAuthnExtensions(
      options.extensions as { prf?: PrfExtensionInput }
    ) as PublicKeyCredentialRequestOptionsJSON["extensions"],
  };
}

/**
 * When `allowCredentials` is scoped to one passkey, use PRF `eval` (not
 * `evalByCredential`) so unlock matches enable-vault-unlock setup on iOS.
 */
export function alignPrfExtensionsForAllowCredentials(
  options: PublicKeyCredentialRequestOptionsJSON,
  forceCredentialId?: string
): PublicKeyCredentialRequestOptionsJSON {
  if (!options.extensions) return options;

  const prf = (options.extensions as { prf?: PrfExtensionInput }).prf;
  if (!prf) return options;

  const credentials = options.allowCredentials;
  const credentialId =
    forceCredentialId ??
    (credentials?.length === 1 ? credentials[0]!.id : undefined);

  if (!credentialId) {
    return options;
  }

  if (prf.eval && !prf.evalByCredential) {
    return options;
  }

  const evalInput =
    prf.evalByCredential?.[credentialId] ??
    prf.eval ??
    (prf.evalByCredential ? Object.values(prf.evalByCredential)[0] : undefined);
  if (!evalInput) return options;

  return {
    ...options,
    extensions: {
      ...(options.extensions as object),
      prf: { eval: evalInput },
    } as PublicKeyCredentialRequestOptionsJSON["extensions"],
  };
}
