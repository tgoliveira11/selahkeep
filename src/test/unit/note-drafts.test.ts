/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import {
  deleteEncryptedNoteDraft,
  loadEncryptedNoteDraft,
  NEW_NOTE_DRAFT_KEY,
  resetNoteDraftDbForTests,
  saveEncryptedNoteDraft,
} from "@/lib/crypto-client/note-drafts";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const store = new Map<string, unknown>();

vi.mock("idb", () => ({
  openDB: vi.fn(async () => ({
    put: vi.fn(async (_name: string, value: { userId: string; draftKey: string }) => {
      store.set(`${value.userId}:${value.draftKey}`, value);
    }),
    get: vi.fn(async (_name: string, key: [string, string]) => store.get(`${key[0]}:${key[1]}`)),
    delete: vi.fn(async (_name: string, key: [string, string]) => {
      store.delete(`${key[0]}:${key[1]}`);
    }),
    transaction: vi.fn(),
  })),
}));

describe("encrypted note drafts", () => {
  beforeEach(async () => {
    store.clear();
    resetNoteDraftDbForTests();
    const key = await generateUserVaultKey();
    setSessionVaultKey(key);
  });

  it("stores and loads encrypted drafts", async () => {
    await saveEncryptedNoteDraft(USER_ID, NEW_NOTE_DRAFT_KEY, {
      title: "Secret title",
      body: "Secret body",
      categoryId: null,
      tagIds: [],
      answered: false,
      updatedAt: new Date().toISOString(),
    });

    const loaded = await loadEncryptedNoteDraft(USER_ID, NEW_NOTE_DRAFT_KEY);
    expect(loaded?.title).toBe("Secret title");
    expect(loaded?.body).toBe("Secret body");
  });

  it("deletes encrypted drafts", async () => {
    await saveEncryptedNoteDraft(USER_ID, NEW_NOTE_DRAFT_KEY, {
      title: "Draft",
      body: "Body",
      categoryId: null,
      tagIds: [],
      answered: false,
      updatedAt: new Date().toISOString(),
    });
    await deleteEncryptedNoteDraft(USER_ID, NEW_NOTE_DRAFT_KEY);
    expect(await loadEncryptedNoteDraft(USER_ID, NEW_NOTE_DRAFT_KEY)).toBeNull();
  });
});
