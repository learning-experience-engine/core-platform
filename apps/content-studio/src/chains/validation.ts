import type { Node } from "@lxp/schema";
import type { DraftChain } from "../types";

export const validateChainDraft = (draft: DraftChain, nodes: Node[]): string[] => {
  const errors: string[] = [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const trimmedId = draft.id.trim();
  const trimmedTitle = draft.title.trim();
  const trimmedTopic = draft.topicNodeId.trim();

  if (!trimmedId) errors.push("Chain id is required.");
  if (!trimmedTitle) errors.push("Chain title is required.");
  if (!trimmedTopic) errors.push("Chain topicNodeId is required.");
  if (trimmedTopic && !nodeIds.has(trimmedTopic)) {
    errors.push(`Chain topicNodeId does not exist (${trimmedTopic}).`);
  }
  if (draft.steps.length === 0) errors.push("Chain must have at least one step.");

  draft.steps.forEach((step, index) => {
    const hasChild = Object.prototype.hasOwnProperty.call(step.answers, "child");
    const hasAdult = Object.prototype.hasOwnProperty.call(step.answers, "adult");
    if (!hasChild || !hasAdult) {
      errors.push(`Step #${index + 1} answers must include child and adult keys.`);
    }
  });

  return errors;
};
