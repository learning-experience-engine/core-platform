export type RelationType = "part_of" | "has_part" | "compare_with" | "related";

export type Facet = "what" | "how" | "in_life" | "compare" | "practice";

export type AgeBand = "child" | "adult";

export type LocalizedText = string | Record<string, string>;

export type Relation = {
  type: RelationType;
  facet: Facet;
  to: string;
  label?: string;
};

export type Node = {
  id: string;
  title: string;
  body: LocalizedText;
  mentions: Record<string, string>;
  relations: Relation[];
};

export type ChainStep = {
  id: string;
  question: string;
  answers: Record<AgeBand, string>;
  mentions?: Record<string, string>;
};

export type QuestionChain = {
  id: string;
  title: string;
  topicNodeId: string;
  steps: ChainStep[];
};
