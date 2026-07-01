import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { encryptNote } from "@/lib/crypto-client/notes";
import { encryptVaultIndex } from "@/lib/crypto-client/vault-index";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

const root = path.resolve(__dirname, "../../..");

function listSourceFiles(target: string, acc: string[] = []): string[] {
  const full = path.join(root, target);
  if (!existsSync(full)) return acc;
  if (statSync(full).isFile()) {
    if (/\.(ts|tsx)$/.test(target)) acc.push(full);
    return acc;
  }
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    listSourceFiles(path.join(target, entry.name), acc);
  }
  return acc;
}

describe("notes UX security regression", () => {
  it("encrypts note titles at rest", async () => {
    const vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);
    const encrypted = await encryptNote(USER_ID, NOTE_ID, {
      title: "Secret title",
      body: "Secret body",
    });
    expect(JSON.stringify(encrypted)).not.toContain("Secret title");
    expect(JSON.stringify(encrypted)).not.toContain("Secret body");
  });

  it("encrypts category and tag names in the vault index", async () => {
    const vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);
    const encrypted = await encryptVaultIndex(
      {
        version: 2,
        categories: [{ id: "c1", name: "Prayer", createdAt: "", updatedAt: "" }],
        tags: [{ id: "t1", name: "faith", createdAt: "", updatedAt: "" }],
        entries: [],
      },
      USER_ID,
      vaultKey
    );
    expect(JSON.stringify(encrypted)).not.toContain("Prayer");
    expect(JSON.stringify(encrypted)).not.toContain("faith");
  });

  it("does not reintroduce active letters routes", () => {
    const files = listSourceFiles("src/app");
    const violations = files.filter((file) => {
      const rel = path.relative(root, file);
      return /\(vault\)\/letters|api\/letters/.test(rel);
    });
    expect(violations).toEqual([]);
  });

  it("does not reintroduce trusted devices UI routes", () => {
    const files = listSourceFiles("src/app");
    const violations = files.filter((file) => path.relative(root, file).includes("/vault/devices"));
    expect(violations).toEqual([]);
  });

  it("notes API routes reject plaintext note fields", () => {
    const notesRoute = readFileSync(path.join(root, "src/app/api/notes/route.ts"), "utf8");
    expect(notesRoute).toContain("assertNoPlaintextNoteFields");
  });
});
