import type { Facet, Node, RelationType } from "@lxp/schema";

export type NodeId = string;

export type NeighborhoodFacet = "all" | Facet;

export type NeighborhoodNode = {
  id: NodeId;
  title: string;
};

export type NeighborhoodEdge = {
  from: NodeId;
  to: NodeId;
  type: RelationType;
  facet: Facet;
};

export type NeighborhoodResult = {
  center: NeighborhoodNode;
  nodes: NeighborhoodNode[];
  edges: NeighborhoodEdge[];
  truncated: boolean;
};

const RELATION_WEIGHTS: Record<RelationType, number> = {
  has_part: 3,
  part_of: 3,
  compare_with: 2,
  related: 1
};

export const getNeighborhood = (
  centerId: NodeId,
  nodesById: Record<NodeId, Node>,
  facet: NeighborhoodFacet,
  limit = 12
): NeighborhoodResult => {
  const centerNode = nodesById[centerId];
  const center: NeighborhoodNode = {
    id: centerId,
    title: centerNode?.title ?? String(centerId)
  };

  if (!centerNode) {
    return { center, nodes: [], edges: [], truncated: false };
  }

  const edges: NeighborhoodEdge[] = [];
  const edgeKeys = new Set<string>();

  centerNode.relations.forEach((relation) => {
    if (facet !== "all" && relation.facet !== facet) return;
    const key = `${centerId}:${relation.to}:${relation.type}:${relation.facet}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({
      from: centerId,
      to: relation.to,
      type: relation.type,
      facet: relation.facet
    });
  });

  const neighborMeta = new Map<NodeId, { weight: number; firstIndex: number }>();
  edges.forEach((edge, index) => {
    const weight = RELATION_WEIGHTS[edge.type] ?? 1;
    const current = neighborMeta.get(edge.to);
    if (!current) {
      neighborMeta.set(edge.to, { weight, firstIndex: index });
      return;
    }
    if (weight > current.weight) {
      neighborMeta.set(edge.to, { weight, firstIndex: current.firstIndex });
    }
  });

  let neighborIds = [...neighborMeta.entries()]
    .sort(
      ([, left], [, right]) =>
        right.weight - left.weight || left.firstIndex - right.firstIndex
    )
    .map(([id]) => id);

  const truncated = neighborIds.length > limit;
  if (truncated) {
    neighborIds = neighborIds.slice(0, Math.max(0, limit));
  }

  const keep = new Set(neighborIds);
  const nodes = neighborIds.map((id) => ({
    id,
    title: nodesById[id]?.title ?? String(id)
  }));
  const filteredEdges = edges.filter((edge) => keep.has(edge.to));

  return {
    center,
    nodes,
    edges: filteredEdges,
    truncated
  };
};
