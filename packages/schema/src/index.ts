export type RelationType = "part_of" | "has_part" | "compare_with" | "related";

export type Facet = "what" | "how" | "in_life" | "compare" | "practice";

export type AgeBand = "child" | "adult";

export type Difficulty = "beginner" | "intermediate" | "advanced";

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
  aliases?: string[];
  body: LocalizedText;
  mentions: Record<string, string>;
  relations: Relation[];
  domain?: string;
  difficulty?: Difficulty;
  tags?: string[];
};

export type Domain = {
  id: string;
  title: string;
  description: string;
  overviewNodeId: string;
  topicNodeIds: string[];
  icon?: string;
  color?: string;
};

export type ChainStep = {
  id: string;
  question: string;
  answers: Record<AgeBand, string>;
  mentions?: Record<string, string>;
  summary?: {
    child?: string;
    adult?: string;
  };
  check?: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation?: {
      child?: string;
      adult?: string;
    };
  };
};

export type QuestionChain = {
  id: string;
  title: string;
  topicNodeId: string;
  steps: ChainStep[];
  goal?: {
    child?: string;
    adult?: string;
  };
  scenario?: string;
  keywords?: string[];
  difficulty?: Difficulty;
  prerequisites?: string[];
  domainId?: string;
};
