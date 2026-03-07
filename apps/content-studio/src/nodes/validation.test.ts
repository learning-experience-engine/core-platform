import { describe, expect, it } from "vitest";
import type { Node } from "@lxp/schema";
import { validateNodeDraft } from "./validation";
import type { DraftNode } from "../types";

const nodes: Node[] = [
  {
    id: "earth",
    title: "Earth",
    body: "",
    mentions: {},
    relations: []
  }
];

const baseDraft: DraftNode = {
  id: "earth",
  title: "Earth",
  aliasesText: "",
  body: "",
  bodyText: "",
  mentions: [],
  relations: [],
  isNew: false
};

describe("validateNodeDraft", () => {
  it("reports required fields and missing relation targets", () => {
    expect(
      validateNodeDraft(
        {
          ...baseDraft,
          id: "",
          title: "",
          relations: [{ id: "r1", type: "related", facet: "what", to: "missing", label: "" }]
        },
        nodes,
        ""
      )
    ).toEqual([
      "Node id is required.",
      "Node title is required.",
      "Relation #1 target does not exist (missing)."
    ]);
  });

  it("allows keeping the currently selected id", () => {
    expect(validateNodeDraft(baseDraft, nodes, "earth")).toEqual([]);
  });
});
