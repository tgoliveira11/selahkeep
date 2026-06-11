import { describe, it, expect } from "vitest";
import { getRecoveryStateLabel } from "@/lib/ui/recovery-state-labels";

describe("recovery state labels", () => {
  it("returns friendly labels without raw enum names in the label", () => {
    expect(getRecoveryStateLabel("Protected").label).not.toBe("Protected");
    expect(getRecoveryStateLabel("Basic").label).not.toBe("Basic");
    expect(getRecoveryStateLabel("At Risk").label).not.toBe("At Risk");
  });
});
