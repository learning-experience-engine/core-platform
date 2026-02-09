import type { Facet, Node, Relation } from "@lxp/schema";
import rawNodes from "../../../content/examples/nodes.json";

export type GraphEdge = {
  sourceId: string;
  targetId: string;
  relation: Relation;
};

export type Neighborhood = {
  nodes: Node[];
  edges: GraphEdge[];
};

const nodes = rawNodes as Node[];

const buildAdjacency = (list: Node[]) => {
  const adjacency = new Map<string, GraphEdge[]>();

  list.forEach((node) => {
    const edges = node.relations.map((relation) => ({
      sourceId: node.id,
      targetId: relation.targetId,
      relation
    }));
    adjacency.set(node.id, edges);
  });

  return adjacency;
};

const adjacency = buildAdjacency(nodes);

const getNode = (id: string): Node | undefined => nodes.find((node) => node.id === id);

export const getNeighborhood = (
  nodeId: string,
  facet?: Facet,
  limit = 8
): Neighborhood => {
  const edges = adjacency.get(nodeId) ?? [];
  const filtered = facet ? edges.filter((edge) => edge.relation.facet === facet) : edges;
  const limited = filtered.slice(0, limit);

  const nodeSet = new Set<string>();
  nodeSet.add(nodeId);
  limited.forEach((edge) => nodeSet.add(edge.targetId));

  const neighborhoodNodes = [...nodeSet]
    .map((id) => getNode(id))
    .filter((node): node is Node => Boolean(node));

  return {
    nodes: neighborhoodNodes,
    edges: limited
  };
};
