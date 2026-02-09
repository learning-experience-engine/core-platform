export type RelationType = "part_of" | "has_part" | "compare_with" | "related";

export type Facet = "what" | "how" | "in_life" | "compare" | "practice";

export type Relation = {
  type: RelationType;
  facet: Facet;
  to: string;
  label?: string;
};

export type Node = {
  id: string;
  title: string;
  body: string;
  mentions: Record<string, string>;
  relations: Relation[];
};
