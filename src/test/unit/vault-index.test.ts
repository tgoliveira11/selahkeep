import { describe, it, expect, beforeEach } from "vitest";
import {
  createEmptyVaultIndex,
  addVaultIndexEntry,
  updateVaultIndexEntry,
  archiveVaultIndexEntry,
  rebuildVaultIndexFromNotes,
  encryptVaultIndex,
  decryptVaultIndex,
  addVaultCategory,
  updateVaultCategory,
  deleteVaultCategory,
  addVaultTag,
  updateVaultTag,
  deleteVaultTag,
} from "@/lib/crypto-client/vault-index";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";

describe("vault index", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    setSessionVaultKey(vaultKey);
  });

  it("adds and updates entries", () => {
    const base = createEmptyVaultIndex();
    const withOne = addVaultIndexEntry(base, {
      id: "n1",
      title: "First",
      categoryId: null,
      tagIds: [],
      answered: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      archived: false,
    });
    expect(withOne.version).toBe(2);
    expect(withOne.categories).toEqual([]);
    expect(withOne.entries).toHaveLength(1);

    const updated = updateVaultIndexEntry(withOne, "n1", { title: "Renamed" });
    expect(updated.entries[0]?.title).toBe("Renamed");
  });

  it("archives entries", () => {
    const base = addVaultIndexEntry(createEmptyVaultIndex(), {
      id: "n1",
      title: "Note",
      categoryId: null,
      tagIds: [],
      answered: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      archived: false,
    });
    const archived = archiveVaultIndexEntry(base, "n1");
    expect(archived.entries[0]?.deletedAt).toBeTruthy();
  });

  it("rebuilds from note metadata", () => {
    const index = rebuildVaultIndexFromNotes([
      {
        id: "a",
        title: "A",
        categoryId: null,
        tagIds: [],
        answered: false,
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "b",
        title: "B",
        categoryId: null,
        tagIds: [],
        answered: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-03T00:00:00.000Z",
        archived: true,
      },
    ]);
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0]?.id).toBe("a");
  });

  it("encrypts and decrypts vault index", async () => {
    const index = addVaultIndexEntry(createEmptyVaultIndex(), {
      id: "n1",
      title: "Secure",
      categoryId: null,
      tagIds: [],
      answered: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const encrypted = await encryptVaultIndex(index, USER_ID, vaultKey);
    const decrypted = await decryptVaultIndex(encrypted, vaultKey);
    expect(decrypted.entries[0]?.title).toBe("Secure");
    expect(decrypted.version).toBe(2);
  });

  it("migrates v1 index on decrypt", async () => {
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
    expect(decrypted.version).toBe(2);
    expect(decrypted.entries[0]?.deletedAt).toBeTruthy();
  });

  it("manages categories and tags in the index", () => {
    let index = createEmptyVaultIndex();
    const { index: withCategory, category } = addVaultCategory(index, "Prayer");
    index = updateVaultCategory(withCategory, category.id, "Reflection");
    const { index: withTag, tag } = addVaultTag(index, "hope");
    index = updateVaultTag(withTag, tag.id, "gratitude");
    index = addVaultIndexEntry(index, {
      id: "n1",
      title: "Note",
      categoryId: category.id,
      tagIds: [tag.id],
      answered: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    index = deleteVaultTag(index, tag.id);
    index = deleteVaultCategory(index, category.id);
    expect(index.categories.find((c) => c.id === category.id)?.deletedAt).toBeTruthy();
    expect(index.entries[0]?.categoryId).toBeNull();
  });
});
