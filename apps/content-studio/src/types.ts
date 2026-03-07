import type { AgeBand, Facet, LocalizedText, RelationType } from "@lxp/schema";

export type MentionRow = {
  id: string;
  term: string;
  targetId: string;
};

export type RelationRow = {
  id: string;
  type: RelationType;
  facet: Facet;
  to: string;
  label: string;
};

export type DraftNode = {
  id: string;
  title: string;
  aliasesText: string;
  body: LocalizedText;
  bodyText: string;
  mentions: MentionRow[];
  relations: RelationRow[];
  isNew: boolean;
};

export type DraftStep = {
  id: string;
  question: string;
  answers: Record<AgeBand, string>;
  mentions: MentionRow[];
  summary: { child: string; adult: string };
  check: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: { child: string; adult: string };
  } | null;
};

export type DraftChain = {
  id: string;
  title: string;
  topicNodeId: string;
  steps: DraftStep[];
  goal: { child: string; adult: string };
  isNew: boolean;
};

export type Mode = "nodes" | "chains";

export type MentionSuggestion = {
  term: string;
  targetId: string;
  targetTitle: string;
  index: number;
};
