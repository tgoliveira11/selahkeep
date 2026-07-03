import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearVaultAutoLockTimer, configureVaultAutoLock, lockVaultSession, registerVaultBeforeAutoLock, unlockVaultSession, VAULT_INACTIVITY_MS } from "@/lib/crypto-client/vault-session";
import { saveEncryptedNoteDraft } from "@/lib/crypto-client/note-drafts";import { generateUserVaultKey } from "@/lib/crypto-client/vault";

vi.mock("@/lib/crypto-client/note-drafts", () => ({
  saveEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
}));

describe("vault auto-lock draft security", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearVaultAutoLockTimer();
    lockVaultSession();
    configureVaultAutoLock();
    vi.mocked(saveEncryptedNoteDraft).mockClear();
  });

  afterEach(() => {
    lockVaultSession();
    configureVaultAutoLock();
    vi.useRealTimers();
  });

  it("beforeAutoLock invokes encrypted draft save before inactivity lock", async () => {
    const key = await generateUserVaultKey();
    await unlockVaultSession(key, "password");

    registerVaultBeforeAutoLock(async () => {
      await saveEncryptedNoteDraft("user-1", "new", {
        title: "Draft",
        body: "Body",
        categoryId: null,
        tagIds: [],
        answered: false,
        updatedAt: new Date().toISOString(),
      });
    });

    vi.advanceTimersByTime(VAULT_INACTIVITY_MS + 1);
    await vi.runAllTimersAsync();

    expect(saveEncryptedNoteDraft).toHaveBeenCalledTimes(1);
    expect(saveEncryptedNoteDraft).toHaveBeenCalledWith(
      "user-1",
      "new",
      expect.objectContaining({ title: "Draft", body: "Body" })
    );
  });
});
