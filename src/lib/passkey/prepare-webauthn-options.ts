import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { prepareWebAuthnPrfExtensions } from "@tgoliveira/vault-core/browser";

export { alignPrfExtensionsForCredential as alignPrfExtensionsForAllowCredentials } from "@tgoliveira/vault-core/browser";

type PrfExtensionInput = Parameters<typeof prepareWebAuthnPrfExtensions>[0];

/** Converts server JSON WebAuthn options so PRF salts are ArrayBuffers for the browser API. */
export function prepareWebAuthnExtensions<T extends PrfExtensionInput>(extensions: T): T {
  return prepareWebAuthnPrfExtensions(extensions) as T;
}

export function prepareRegistrationOptions(
  options: PublicKeyCredentialCreationOptionsJSON
): PublicKeyCredentialCreationOptionsJSON {
  if (!options.extensions) return options;
  return {
    ...options,
    extensions: prepareWebAuthnPrfExtensions(
      options.extensions as PrfExtensionInput
    ) as PublicKeyCredentialCreationOptionsJSON["extensions"],
  };
}

export function prepareAuthenticationOptions(
  options: PublicKeyCredentialRequestOptionsJSON
): PublicKeyCredentialRequestOptionsJSON {
  if (!options.extensions) return options;
  return {
    ...options,
    extensions: prepareWebAuthnPrfExtensions(
      options.extensions as PrfExtensionInput
    ) as PublicKeyCredentialRequestOptionsJSON["extensions"],
  };
}
