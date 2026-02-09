import type { Facet, RelationType, Node } from "@lxp/schema";

export type RelationView = {
  facet: Facet;
  type: RelationType;
  to: string;
  title: string;
  label?: string;
};

export const groupRelationsByFacet = (
  node: Node,
  nodesById: Record<string, Node>
): Record<Facet, RelationView[]> => {
  const groups = {
    what: [] as RelationView[],
    how: [] as RelationView[],
    in_life: [] as RelationView[],
    compare: [] as RelationView[],
    practice: [] as RelationView[]
  } satisfies Record<Facet, RelationView[]>;

  node.relations.forEach((relation) => {
    const target = nodesById[relation.to];
    const view: RelationView = {
      facet: relation.facet,
      type: relation.type,
      to: relation.to,
      title: target?.title ?? relation.to,
      label: relation.label
    };

    const bucket = groups[relation.facet];
    if (bucket) {
      bucket.push(view);
    }
  });

  return groups;
};
