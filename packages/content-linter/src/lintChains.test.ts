import { describe, expect, it } from "vitest";
import type { Node, QuestionChain } from "@lxp/schema";
import { lintChains } from "./index";

describe("lintChains", () => {
  it("reports invalid chain references and missing answers", () => {
    const nodes: Node[] = [
      { id: "root", title: "Root", body: "", mentions: {}, relations: [] },
      { id: "target", title: "Target", body: "", mentions: {}, relations: [] }
    ];
    const chains: QuestionChain[] = [
      {
        id: "chain-a",
        title: "Chain A",
        topicNodeId: "missing",
        steps: [
          {
            id: "step-1",
            question: "Q1",
            answers: {
              child: "A1"
            } as Record<"child" | "adult", string>,
            mentions: {
              term: "missing"
            }
          }
        ]
      }
    ];

    const result = lintChains(chains, nodes);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("topicNodeId=missing not found")
        }),
        expect.objectContaining({
          message: expect.stringContaining("missing child/adult answers")
        }),
        expect.objectContaining({
          message: expect.stringContaining("mention term=\"term\" -> nodeId=\"missing\" not found")
        })
      ])
    );
  });

  it("flags duplicate chain ids and empty steps", () => {
    const nodes: Node[] = [
      { id: "root", title: "Root", body: "", mentions: {}, relations: [] }
    ];
    const chains: QuestionChain[] = [
      {
        id: "dup",
        title: "Chain 1",
        topicNodeId: "root",
        steps: []
      },
      {
        id: "dup",
        title: "Chain 2",
        topicNodeId: "root",
        steps: [
          {
            id: "s1",
            question: "Q",
            answers: { child: "A", adult: "B" }
          }
        ]
      }
    ];

    const result = lintChains(chains, nodes);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "[ERROR] chain=dup duplicate id"
        }),
        expect.objectContaining({
          message: expect.stringContaining("has 0 steps")
        })
      ])
    );
  });
});
