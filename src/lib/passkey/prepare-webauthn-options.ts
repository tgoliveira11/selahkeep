import { base64UrlToBytes } from "@/lib/crypto-client/encoding";

type PrfEvalInput = {
  first?: string | ArrayBuffer;
  second?: string | ArrayBuffer;
};

type PrfExtensionInput = {
  eval?: PrfEvalInput;
  evalByCredential?: Record<string, PrfEvalInput>;
};

function toArrayBuffer(value: string | ArrayBuffer): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value;
  const bytes = base64UrlToBytes(value);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
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

export function prepareRegistrationOptions<
  T extends { extensions?: { prf?: PrfExtensionInput } },
>(options: T): T {
  if (!options.extensions) return options;
  return {
    ...options,
    extensions: prepareWebAuthnExtensions(options.extensions),
  };
}

export function prepareAuthenticationOptions<
  T extends { extensions?: { prf?: PrfExtensionInput } },
>(options: T): T {
  return prepareRegistrationOptions(options);
}
