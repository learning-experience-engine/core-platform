import { describe, expect, it } from "vitest";
import type { Node } from "@lxp/schema";
import {
  buildDraftNode,
  buildNode,
  emptyDraftNode,
  normalizeAliases,
  updateBody
} from "./draft";

const node: Node = {
  id: "earth",
  title: "Earth",
  aliases: ["Planet Earth", "Blue Planet"],
  body: { zh: "地球", en: "Earth" },
  mentions: { 月球: "moon" },
  relations: [{ type: "related", facet: "what", to: "moon", label: "neighbor" }]
};

describe("node draft helpers", () => {
  it("normalizes aliases by trimming empties and deduping case-insensitively", () => {
    expect(normalizeAliases(" Earth\nplanet\nPLANET\n\nEarth ")).toEqual(["Earth", "planet"]);
  });

  it("updates preferred localized body entry", () => {
    expect(updateBody({ zh: "旧", en: "old" }, "新")).toEqual({ zh: "新", en: "old" });
  });

  it("builds draft from node and serializes back without changing payload shape", () => {
    const draft = buildDraftNode(node);

    expect(draft.id).toBe("earth");
    expect(draft.aliasesText).toBe("Planet Earth\nBlue Planet");
    expect(draft.bodyText).toBe("地球");

    expect(buildNode(draft)).toEqual(node);
  });

  it("creates an empty new node draft", () => {
    expect(emptyDraftNode()).toEqual({
      id: "",
      title: "",
      aliasesText: "",
      body: "",
      bodyText: "",
      mentions: [],
      relations: [],
      isNew: true
    });
  });
});
