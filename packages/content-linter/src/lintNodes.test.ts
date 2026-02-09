import { describe, expect, it } from "vitest";
import type { Node } from "@lxp/schema";
import { lintNodes } from "./index";

describe("lintNodes", () => {
  it("reports missing relation targets and invalid enums", () => {
    const nodes: Node[] = [
      {
        id: "a",
        title: "A",
        body: "",
        mentions: {},
        relations: [
          {
            type: "part_of",
            facet: "what",
            to: "missing"
          },
          {
            type: "related",
            facet: "what",
            to: "a"
          }
        ]
      },
      {
        id: "b",
        title: "B",
        body: "",
        mentions: {
          term: "missing"
        },
        relations: []
      }
    ];

    const result = lintNodes(nodes);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("relation[0].to=missing not found")
        }),
        expect.objectContaining({
          message: expect.stringContaining("mention term=\"term\" -> nodeId=\"missing\" not found")
        })
      ])
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("node=b has 0 relations")
        })
      ])
    );
  });

  it("flags duplicate ids", () => {
    const nodes: Node[] = [
      {
        id: "dup",
        title: "Dup",
        body: "",
        mentions: {},
        relations: [
          {
            type: "part_of",
            facet: "what",
            to: "dup"
          }
        ]
      },
      {
        id: "dup",
        title: "Dup2",
        body: "",
        mentions: {},
        relations: [
          {
            type: "part_of",
            facet: "what",
            to: "dup"
          }
        ]
      }
    ];

    const result = lintNodes(nodes);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "[ERROR] node=dup duplicate id"
        })
      ])
    );
  });

  it("reports empty aliases as errors", () => {
    const nodes: Node[] = [
      {
        id: "alias_empty",
        title: "Alias Empty",
        aliases: ["   "],
        body: "",
        mentions: {},
        relations: [
          {
            type: "part_of",
            facet: "what",
            to: "alias_empty"
          }
        ]
      }
    ];

    const result = lintNodes(nodes);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("alias[0] empty")
        })
      ])
    );
  });

  it("warns on duplicate, title-matching, and short aliases", () => {
    const nodes: Node[] = [
      {
        id: "alias_warn",
        title: "Wind",
        aliases: ["Wind", "gust", "Gust", "go"],
        body: "",
        mentions: {},
        relations: [
          {
            type: "part_of",
            facet: "what",
            to: "alias_warn"
          }
        ]
      }
    ];

    const result = lintNodes(nodes);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("alias=\"Wind\" matches title")
        }),
        expect.objectContaining({
          message: expect.stringContaining("alias=\"Gust\" duplicate")
        }),
        expect.objectContaining({
          message: expect.stringContaining("alias=\"go\" too short")
        })
      ])
    );
  });
});
