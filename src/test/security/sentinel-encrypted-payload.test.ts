import { describe, it, expect } from "vitest";
import { encryptLetter } from "@/lib/crypto-client/letters";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { SENTINEL_PHRASE } from "./sentinel-phrase.test";
import { USER_ID, LETTER_ID } from "@/test/helpers/fixtures";

describe("sentinel phrase encrypted payload leakage", () => {
  it("does not expose sentinel phrase outside ciphertext fields", async () => {
    const vaultKey = await generateUserVaultKey();
    setSessionVaultKey(vaultKey);

    const payload = await encryptLetter(USER_ID, LETTER_ID, SENTINEL_PHRASE, SENTINEL_PHRASE);
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain(`"title":"${SENTINEL_PHRASE}"`);
    expect(serialized).not.toContain(`"body":"${SENTINEL_PHRASE}"`);
    expect(serialized).not.toMatch(new RegExp(`"${SENTINEL_PHRASE}"`));

    for (const value of Object.values(payload)) {
      if (typeof value === "object" && value && "aad" in value) {
        const aad = (value as { aad: Record<string, string> }).aad;
        for (const aadValue of Object.values(aad)) {
          expect(aadValue).not.toContain(SENTINEL_PHRASE);
        }
      }
    }
  });
});
