/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  assertNoVaultPlaintextInDocument,
  SENTINEL_PRIVATE_NOTE,
} from "@tgoliveira/vault-core/testing";

describe("assertNoVaultPlaintextInDocument", () => {
  it("passes when sentinel is absent", () => {
    render(<p>Public chrome only</p>);
    expect(() => assertNoVaultPlaintextInDocument(document.body)).not.toThrow();
  });

  it("throws when vault-core sentinel remains in DOM after lock", () => {
    render(<p>{SENTINEL_PRIVATE_NOTE}</p>);
    expect(() => assertNoVaultPlaintextInDocument(document.body)).toThrow(/sentinel/i);
  });
});
