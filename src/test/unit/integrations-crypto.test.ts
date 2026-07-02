import { describe, expect, it } from "vitest";
import {
  deriveIntegrationKey,
  exportIntegrationKeyBase64Url,
  importIntegrationKeyFromBase64Url,
  wrapResourceKeyForIntegration,
  unwrapResourceKeyFromGrant,
} from "@/lib/crypto-client/integrations";
import { setSessionVaultKey } from "@/lib/crypto-client/vault";
import { generateAesKey, exportAesKey } from "@/lib/crypto-client/aes-gcm";

const USER_ID = "fc12f4d6-9799-4547-a6a6-bc60e258784d";
const INTEGRATION_ID = "6ba26317-e15f-4818-ac44-1a46351c0638";
const NOTE_ID = "fdf7aa47-edef-4ace-a0b0-cc920846b365";

describe("integrations crypto", () => {
  it("wraps and unwraps resource keys for grants", async () => {
    const uvk = await generateAesKey();
    setSessionVaultKey(uvk);

    const noteKey = await generateAesKey();
    const iek = await deriveIntegrationKey(INTEGRATION_ID, uvk);
    const exported = await exportIntegrationKeyBase64Url(iek);
    const iek2 = await importIntegrationKeyFromBase64Url(exported);

    const grant = await wrapResourceKeyForIntegration(
      USER_ID,
      INTEGRATION_ID,
      NOTE_ID,
      noteKey,
      iek
    );

    const unwrapped = await unwrapResourceKeyFromGrant(grant, iek2);
    expect(await exportAesKey(unwrapped)).toEqual(await exportAesKey(noteKey));
  });
});
