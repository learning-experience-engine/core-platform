import { describe, expect, it } from "vitest";
import type { Node } from "@lxp/schema";
import { validateChainDraft } from "./validation";
import type { DraftChain } from "../types";

const nodes: Node[] = [
  {
    id: "earth",
    title: "Earth",
    body: "",
    mentions: {},
    relations: []
  }
];

const baseDraft: DraftChain = {
  id: "earth_intro",
  title: "Earth intro",
  topicNodeId: "earth",
  steps: [
    {
      id: "step_1",
      question: "What is Earth?",
      answers: { child: "Home", adult: "Planet" },
      mentions: [],
      summary: { child: "", adult: "" },
      check: null
    }
  ],
  goal: { child: "", adult: "" },
  isNew: false
};

describe("validateChainDraft", () => {
  it("reports missing required fields and topic ids", () => {
    expect(
      validateChainDraft(
        {
          ...baseDraft,
          id: "",
          title: "",
          topicNodeId: "missing",
          steps: []
        },
        nodes
      )
    ).toEqual([
      "Chain id is required.",
      "Chain title is required.",
      "Chain topicNodeId does not exist (missing).",
      "Chain must have at least one step."
    ]);
  });

  it("accepts a valid chain draft", () => {
    expect(validateChainDraft(baseDraft, nodes)).toEqual([]);
  });
});
