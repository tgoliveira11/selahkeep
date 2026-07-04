import { describe, it, expect } from "vitest";
import {
  collectPostgresErrorMessages,
  isMissingRelationError,
  isSchemaDriftOnRelation,
} from "@/lib/db/missing-relation-error";

describe("missing-relation-error", () => {
  it("collects drizzle-wrapped postgres messages", () => {
    const error = Object.assign(new Error("Failed query: select from note_kanban_boards"), {
      cause: Object.assign(new Error('relation "note_kanban_boards" does not exist'), {
        code: "42P01",
      }),
    });
    expect(collectPostgresErrorMessages(error)).toContain(
      'relation "note_kanban_boards" does not exist'
    );
  });

  it("detects a missing kanban boards relation", () => {
    const error = Object.assign(new Error('relation "note_kanban_boards" does not exist'), {
      code: "42P01",
    });
    expect(isMissingRelationError(error, "note_kanban_boards")).toBe(true);
  });

  it("ignores missing-column errors that mention the relation name", () => {
    const error = Object.assign(
      new Error('column "version_number" of relation "note_kanban_boards" does not exist'),
      { code: "42703" }
    );
    expect(isMissingRelationError(error, "note_kanban_boards")).toBe(false);
  });

  it("ignores undefined-relation errors for other tables", () => {
    const error = Object.assign(new Error('relation "notes" does not exist'), { code: "42P01" });
    expect(isMissingRelationError(error, "note_kanban_boards")).toBe(false);
  });

  it("detects schema drift on a relation (missing column)", () => {
    const error = Object.assign(
      new Error('column "board_id" of relation "note_attachments" does not exist'),
      { code: "42703" }
    );
    expect(isSchemaDriftOnRelation(error, "note_attachments")).toBe(true);
    expect(isMissingRelationError(error, "note_attachments")).toBe(false);
  });
});
