import { describe, it, expect } from "vitest";
import {
  cardMatchesSearch,
  extractCardTagsFromDescription,
  formatCardTagMarkers,
  mergeDescriptionWithCardTags,
  parseCardTagMarkers,
  stripCardTagMarkers,
} from "@/lib/notes/kanban-card-tags";

describe("kanban card tags", () => {
  it("parses and strips {tag} markers", () => {
    expect(parseCardTagMarkers("Work item\n{family} {urgent}")).toEqual(["family", "urgent"]);
    expect(stripCardTagMarkers("Work item\n{family} {urgent}")).toBe("Work item");
    expect(formatCardTagMarkers(["family", "urgent"])).toBe("{family} {urgent}");
  });

  it("merges tags into description for note sync", () => {
    expect(mergeDescriptionWithCardTags("Details here", ["family"])).toBe(
      "Details here\n{family}"
    );
  });

  it("extracts tags from stored description", () => {
    expect(extractCardTagsFromDescription("Line one\n{alpha} {beta}")).toEqual(["alpha", "beta"]);
  });

  it("matches cards by title, description, and tags", () => {
    const card = {
      title: "Prayer list",
      description: "Morning items\n{faith}",
      tagNames: ["faith"],
    };
    expect(cardMatchesSearch(card, "faith")).toBe(true);
    expect(cardMatchesSearch(card, "morning")).toBe(true);
    expect(cardMatchesSearch(card, "other")).toBe(false);
  });
});
