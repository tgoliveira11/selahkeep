import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, beforeEach } from "vitest";
import {
  createEmptyVaultIndex,
  addVaultIndexEntry,
  updateVaultIndexEntry,
  archiveVaultIndexEntry,
  trashVaultIndexEntry,
  restoreVaultIndexEntry,
  setNoteArchived,
  rebuildVaultIndexFromNotes,
  encryptVaultIndex,
  decryptVaultIndex,
  addVaultCategory,
  updateVaultCategory,
  deleteVaultCategory,
  addVaultTag,
  updateVaultTag,
  deleteVaultTag,
  getActiveVaultEntries,
  getTrashedVaultEntries,
} from "@/lib/crypto-client/vault-index";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";

const baseEntry = {
  id: "n1",
  title: "First",
  categoryId: null,
  tagIds: [] as string[],
  answered: false,
  pinned: false,
  favorite: false,
  archived: false,
  trashed: false,
  trashedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("vault index", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);
  });

  it("adds and updates entries", () => {
    const base = createEmptyVaultIndex();
    const withOne = addVaultIndexEntry(base, baseEntry);
    expect(withOne.version).toBe(3);
    expect(withOne.categories).toEqual([]);
    expect(withOne.entries).toHaveLength(1);

    const updated = updateVaultIndexEntry(withOne, "n1", { title: "Renamed" });
    expect(updated.entries[0]?.title).toBe("Renamed");
  });

  it("trashes entries via archiveVaultIndexEntry (legacy alias)", () => {
    const base = addVaultIndexEntry(createEmptyVaultIndex(), baseEntry);
    const trashed = archiveVaultIndexEntry(base, "n1");
    expect(trashed.entries[0]?.trashed).toBe(true);
    expect(trashed.entries[0]?.trashedAt).toBeTruthy();
  });

  it("trashes and restores entries", () => {
    const base = addVaultIndexEntry(createEmptyVaultIndex(), baseEntry);
    const trashed = trashVaultIndexEntry(base, "n1");
    expect(getTrashedVaultEntries(trashed)).toHaveLength(1);

    const restored = restoreVaultIndexEntry(trashed, "n1");
    expect(restored.entries[0]?.trashed).toBe(false);
    expect(getActiveVaultEntries(restored)).toHaveLength(1);
  });

  it("archives entries separately from trash", () => {
    const base = addVaultIndexEntry(createEmptyVaultIndex(), baseEntry);
    const archived = setNoteArchived(base, "n1", true);
    expect(archived.entries[0]?.archived).toBe(true);
    expect(archived.entries[0]?.trashed).toBe(false);
    expect(getActiveVaultEntries(archived)).toHaveLength(0);
  });

  it("rebuilds from note metadata excluding archived and trashed", () => {
    const index = rebuildVaultIndexFromNotes([
      { id: "a", title: "A", categoryId: null, tagIds: [], answered: false, createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" },
      { id: "b", title: "B", categoryId: null, tagIds: [], answered: true, archived: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-03T00:00:00.000Z" },
      { id: "c", title: "C", categoryId: null, tagIds: [], answered: false, trashed: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-03T00:00:00.000Z" },
    ]);
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0]?.id).toBe("a");
  });

  it("encrypts and decrypts vault index v3", async () => {
    const index = addVaultIndexEntry(createEmptyVaultIndex(), baseEntry);
    const encrypted = await encryptVaultIndex(index, USER_ID, vaultKey);
    const decrypted = await decryptVaultIndex(encrypted, vaultKey);
    expect(decrypted.entries[0]?.title).toBe("First");
    expect(decrypted.version).toBe(3);
  });

  it("migrates v1 index on decrypt to v3 with trashed legacy archived entries", async () => {
    const v1 = {
      version: 1 as const,
      entries: [
        {
          id: "n1",
          title: "Legacy",
          categoryId: null,
          tagIds: [],
          answered: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          archived: true,
        },
      ],
    };
    const encrypted = await encryptVaultIndex(v1 as never, USER_ID, vaultKey);
    const decrypted = await decryptVaultIndex(encrypted, vaultKey);
    expect(decrypted.version).toBe(3);
    expect(decrypted.entries[0]?.trashed).toBe(true);
  });

  it("migrates v2 deletedAt to trashed", async () => {
    const v2 = {
      version: 2 as const,
      categories: [],
      tags: [],
      entries: [
        {
          ...baseEntry,
          deletedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    };
    const encrypted = await encryptVaultIndex(v2 as never, USER_ID, vaultKey);
    const decrypted = await decryptVaultIndex(encrypted, vaultKey);
    expect(decrypted.entries[0]?.trashed).toBe(true);
    expect(decrypted.entries[0]?.trashedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("manages categories and tags in the index", () => {
    let index = createEmptyVaultIndex();
    const { index: withCategory, category } = addVaultCategory(index, "Prayer");
    index = updateVaultCategory(withCategory, category.id, "Reflection");
    const { index: withTag, tag } = addVaultTag(index, "hope");
    index = updateVaultTag(withTag, tag.id, "gratitude");
    index = addVaultIndexEntry(index, {
      ...baseEntry,
      categoryId: category.id,
      tagIds: [tag.id],
    });
    index = deleteVaultTag(index, tag.id);
    index = deleteVaultCategory(index, category.id);
    expect(index.categories.find((c) => c.id === category.id)?.deletedAt).toBeTruthy();
    expect(index.entries[0]?.categoryId).toBeNull();
  });
});
