import { describe, expect, it } from "vitest";
import type { Node } from "@lxp/schema";
import { getNeighborhood } from "./index";

const buildNode = (overrides: Partial<Node> & { id: string }): Node => ({
  id: overrides.id,
  title: overrides.title ?? overrides.id,
  body: overrides.body ?? "",
  mentions: overrides.mentions ?? {},
  relations: overrides.relations ?? []
});

describe("getNeighborhood", () => {
  it("dedupes nodes and edges", () => {
    const center = buildNode({
      id: "center",
      relations: [
        { type: "related", facet: "what", to: "alpha" },
        { type: "related", facet: "what", to: "alpha" }
      ]
    });
    const alpha = buildNode({ id: "alpha" });
    const nodesById = { center, alpha };

    const result = getNeighborhood("center", nodesById, "all", 12);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe("alpha");
    expect(result.edges).toHaveLength(1);
  });

  it("filters by facet when not all", () => {
    const center = buildNode({
      id: "center",
      relations: [
        { type: "related", facet: "what", to: "alpha" },
        { type: "related", facet: "how", to: "beta" }
      ]
    });
    const nodesById = {
      center,
      alpha: buildNode({ id: "alpha" }),
      beta: buildNode({ id: "beta" })
    };

    const result = getNeighborhood("center", nodesById, "what", 12);

    expect(result.nodes.map((node) => node.id)).toEqual(["alpha"]);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.to).toBe("alpha");
  });

  it("limits neighbors with priority and marks truncated", () => {
    const center = buildNode({
      id: "center",
      relations: [
        { type: "related", facet: "what", to: "alpha" },
        { type: "compare_with", facet: "what", to: "beta" },
        { type: "part_of", facet: "what", to: "gamma" }
      ]
    });
    const nodesById = {
      center,
      alpha: buildNode({ id: "alpha" }),
      beta: buildNode({ id: "beta" }),
      gamma: buildNode({ id: "gamma" })
    };

    const result = getNeighborhood("center", nodesById, "all", 2);

    expect(result.truncated).toBe(true);
    expect(result.nodes.map((node) => node.id)).toEqual(["gamma", "beta"]);
    expect(result.edges.map((edge) => edge.to)).toEqual(["beta", "gamma"]);
  });
});
