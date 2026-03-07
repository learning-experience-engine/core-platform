import { describe, expect, it } from "vitest";
import type { Node } from "@lxp/schema";
import { buildMentionSuggestions } from "./mentions";

const nodes: Node[] = [
  {
    id: "moon",
    title: "Moon",
    aliases: ["Luna"],
    body: "",
    mentions: {},
    relations: []
  },
  {
    id: "earth",
    title: "Earth",
    aliases: ["Blue Planet"],
    body: "",
    mentions: {},
    relations: []
  }
];

describe("buildMentionSuggestions", () => {
  it("finds terms in text and sorts longer matches first", () => {
    const suggestions = buildMentionSuggestions("Blue Planet and Moon", nodes, []);

    expect(suggestions.map((item) => item.term)).toEqual(["Blue Planet", "Moon"]);
  });

  it("skips existing mentions and excluded node ids", () => {
    const suggestions = buildMentionSuggestions(
      "Moon and Luna",
      nodes,
      [{ id: "1", term: "Moon", targetId: "moon" }],
      "moon"
    );

    expect(suggestions).toEqual([]);
  });
});
