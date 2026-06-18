import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

describe("reflective workflows security", () => {
  it("does not send reflection fields to notes API from detail page", () => {
    const page = readFileSync(
      path.join(root, "src/app/(vault)/notes/[id]/page.tsx"),
      "utf8"
    );
    expect(page).toMatch(/resolveNoteWithReflection/);
    expect(page).not.toMatch(/notesApi\.\w+\([^)]*whatChanged/);
    expect(page).not.toMatch(/fetch\([^)]*reflection/);
  });

  it("stores reflection in encrypted metadata types only", () => {
    const notes = readFileSync(
      path.join(root, "src/lib/crypto-client/notes.ts"),
      "utf8"
    );
    expect(notes).toMatch(/resolvedReflection\?: ResolvedReflection/);
    expect(notes).toMatch(/lifecycleEvents\?: NoteLifecycleEvent/);
  });

  it("does not add plaintext reflection API routes", () => {
    const apiDir = path.join(root, "src/app/api");
    const grep = (dir: string): string => {
      const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
      let content = "";
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) content += grep(full);
        else if (name.endsWith(".ts")) content += readFileSync(full, "utf8");
      }
      return content;
    };
    const api = grep(apiDir);
    expect(api).not.toMatch(/resolvedReflection/);
    expect(api).not.toMatch(/lifecycleEvents/);
    expect(api).not.toMatch(/whatToRemember/);
  });

  it("documents track 5 local-only guarantees", () => {
    const doc = readFileSync(
      path.join(root, "docs/REFLECTIVE_SPIRITUAL_WORKFLOWS_TRACK_5_IMPLEMENTATION.md"),
      "utf8"
    );
    expect(doc).toMatch(/No AI/i);
    expect(doc).toMatch(/encrypted note metadata/i);
  });

  it("weekly reflection carry-forward stays client until note create", () => {
    const page = readFileSync(
      path.join(root, "src/app/(vault)/notes/weekly-reflection/page.tsx"),
      "utf8"
    );
    expect(page).toMatch(/createNote/);
    expect(page).not.toMatch(/notesApi\.\w+\([^)]*carryForward/);
  });
});
