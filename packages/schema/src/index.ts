export type RelationType = "part_of" | "compare_with" | "related";

export type Facet = "what" | "how" | "in_life" | "compare" | "practice";

export type Relation = {
  type: RelationType;
  facet: Facet;
  targetId: string;
};

export type Node = {
  id: string;
  title: string;
  body: string;
  mentions: Record<string, string>;
  relations: Relation[];
};
