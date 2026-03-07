import type { ChainStep, QuestionChain } from "@lxp/schema";
import { DEFAULT_CHAIN_STEP_TEMPLATES } from "../constants";
import type { DraftChain, DraftStep } from "../types";
import { toMentionRecord, toMentionRows } from "../nodes/draft";

export const buildDraftStep = (step: ChainStep): DraftStep => ({
  id: step.id,
  question: step.question,
  answers: {
    child: step.answers.child ?? "",
    adult: step.answers.adult ?? ""
  },
  mentions: toMentionRows(step.mentions),
  summary: {
    child: step.summary?.child ?? "",
    adult: step.summary?.adult ?? ""
  },
  check: step.check
    ? {
        question: step.check.question ?? "",
        options: [...step.check.options],
        answerIndex: step.check.answerIndex ?? 0,
        explanation: {
          child: step.check.explanation?.child ?? "",
          adult: step.check.explanation?.adult ?? ""
        }
      }
    : null
});

export const buildDraftChain = (chain: QuestionChain): DraftChain => ({
  id: chain.id,
  title: chain.title,
  topicNodeId: chain.topicNodeId,
  goal: {
    child: chain.goal?.child ?? "",
    adult: chain.goal?.adult ?? ""
  },
  steps: chain.steps.map(buildDraftStep),
  isNew: false
});

export const buildStepPayload = (step: DraftStep): ChainStep => {
  const summaryChild = step.summary.child.trim();
  const summaryAdult = step.summary.adult.trim();
  const summary =
    summaryChild || summaryAdult ? { child: summaryChild, adult: summaryAdult } : undefined;
  const check =
    step.check === null
      ? undefined
      : {
          question: step.check.question.trim(),
          options: step.check.options.map((option) => option.trim()),
          answerIndex: step.check.answerIndex,
          explanation: {
            child: step.check.explanation.child.trim(),
            adult: step.check.explanation.adult.trim()
          }
        };

  return {
    id: step.id,
    question: step.question.trim(),
    answers: {
      child: step.answers.child.trim(),
      adult: step.answers.adult.trim()
    },
    mentions: toMentionRecord(step.mentions),
    ...(summary ? { summary } : {}),
    ...(check ? { check } : {})
  };
};

export const buildChain = (draft: DraftChain): QuestionChain => {
  const goalChild = draft.goal.child.trim();
  const goalAdult = draft.goal.adult.trim();
  const goal = goalChild || goalAdult ? { child: goalChild, adult: goalAdult } : undefined;

  return {
    id: draft.id.trim(),
    title: draft.title.trim(),
    topicNodeId: draft.topicNodeId.trim(),
    steps: draft.steps.map(buildStepPayload),
    ...(goal ? { goal } : {})
  };
};

export const createEmptyChain = (id: string, topicNodeId: string): DraftChain => ({
  id,
  title: "",
  topicNodeId,
  steps: [],
  goal: { child: "", adult: "" },
  isNew: true
});

export const createStep = (id: string): DraftStep => ({
  id,
  question: "",
  answers: { child: "", adult: "" },
  mentions: [],
  summary: { child: "", adult: "" },
  check: null
});

export const buildTemplateAnswer = (hint: string): string => {
  return `（占位）请补充回答。\n提示：${hint}`;
};

export const createTemplateStep = (index: number): DraftStep => {
  const template = DEFAULT_CHAIN_STEP_TEMPLATES[index] ?? DEFAULT_CHAIN_STEP_TEMPLATES[0];
  return {
    id: `step_${index + 1}`,
    question: template.question,
    answers: {
      child: buildTemplateAnswer(template.hint),
      adult: buildTemplateAnswer(template.hint)
    },
    mentions: [],
    summary: { child: "", adult: "" },
    check: null
  };
};

export const getNextStepId = (steps: DraftStep[]): string => {
  const existing = new Set(steps.map((step) => step.id));
  let index = steps.length + 1;
  while (existing.has(`step_${index}`)) {
    index += 1;
  }
  return `step_${index}`;
};
