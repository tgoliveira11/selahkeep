import { describe, expect, it } from "vitest";
import {
  assertIntegrationGrantAad,
  assertNoIntegrationPlaintextFields,
  IntegrationPlaintextRejectionError,
} from "@/lib/validation/integrations";
import { USER_ID, NOTE_ID, encryptedPayload } from "@/test/helpers/fixtures";

const INTEGRATION_ID = "6ba26317-e15f-4818-ac44-1a46351c0638";

describe("integration plaintext rejection", () => {
  it("rejects forbidden plaintext fields", () => {
    expect(() => assertNoIntegrationPlaintextFields({ title: "secret" })).toThrow(
      IntegrationPlaintextRejectionError
    );
    expect(() => assertNoIntegrationPlaintextFields({ integrationKey: "x" })).toThrow(
      IntegrationPlaintextRejectionError
    );
  });

  it("validates grant AAD binding", () => {
    const payload = {
      ...encryptedPayload("integration_grant", NOTE_ID),
      aad: {
        userId: USER_ID,
        resourceId: NOTE_ID,
        field: "integration_grant" as const,
        integrationId: INTEGRATION_ID,
      },
    };
    expect(() =>
      assertIntegrationGrantAad(USER_ID, INTEGRATION_ID, NOTE_ID, payload)
    ).not.toThrow();
    expect(() =>
      assertIntegrationGrantAad("00000000-0000-0000-0000-000000000099", INTEGRATION_ID, NOTE_ID, payload)
    ).toThrow("userId mismatch");
  });
});
