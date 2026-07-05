/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { getCachedNoteBody, setCachedNoteBody } from "@/features/notes/eager-decrypt-notes";

vi.mock("@tgoliveira/vault-core/browser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/vault-core/browser")>();
  return {
    ...actual,
    registerVaultLockCleanup: vi.fn(actual.registerVaultLockCleanup),
  };
});

describe("registerSelahkeepVaultLockCleanup", () => {
  it("registers clearNoteBodyCache with vault-core lock cleanup", async () => {
    const { registerVaultLockCleanup } = await import("@tgoliveira/vault-core/browser");
    vi.mocked(registerVaultLockCleanup).mockClear();

    const { registerSelahkeepVaultLockCleanup, resetSelahkeepVaultLockCleanupRegistrationForTests } =
      await import("@/lib/vault/register-selahkeep-vault-lock-cleanup");
    resetSelahkeepVaultLockCleanupRegistrationForTests();
    registerSelahkeepVaultLockCleanup();

    expect(registerVaultLockCleanup).toHaveBeenCalledTimes(1);
    setCachedNoteBody("note-1", "secret body");
    const handler = vi.mocked(registerVaultLockCleanup).mock.calls[0]?.[0];
    handler?.();
    expect(getCachedNoteBody("note-1")).toBeUndefined();
  });
});
