import { describe, expect, it } from "vitest";
import type { QuestionChain } from "@lxp/schema";
import {
  buildChain,
  buildDraftChain,
  buildStepPayload,
  createEmptyChain,
  createStep,
  createTemplateStep,
  getNextStepId
} from "./draft";

const chain: QuestionChain = {
  id: "earth_intro",
  title: "Earth intro",
  topicNodeId: "earth",
  goal: { child: "认识地球", adult: "理解地球" },
  steps: [
    {
      id: "step_1",
      question: "What is Earth?",
      answers: { child: "Home", adult: "A planet" },
      mentions: { Earth: "earth" },
      summary: { child: "Home", adult: "Planet" },
      check: {
        question: "Which one is Earth?",
        options: ["Sun", "Earth"],
        answerIndex: 1,
        explanation: { child: "It is Earth", adult: "The second option is Earth" }
      }
    }
  ]
};

describe("chain draft helpers", () => {
  it("builds draft and serializes back while preserving optional fields", () => {
    const draft = buildDraftChain(chain);

    expect(draft.id).toBe("earth_intro");
    expect(buildChain(draft)).toEqual(chain);
  });

  it("drops summary and check when they are empty/null", () => {
    expect(
      buildStepPayload({
        id: "step_2",
        question: "  Q  ",
        answers: { child: " c ", adult: " a " },
        mentions: [],
        summary: { child: "", adult: "" },
        check: null
      })
    ).toEqual({
      id: "step_2",
      question: "Q",
      answers: { child: "c", adult: "a" },
      mentions: {}
    });
  });

  it("creates empty, blank, and template steps with stable ids", () => {
    expect(createEmptyChain("chain_1", "earth")).toEqual({
      id: "chain_1",
      title: "",
      topicNodeId: "earth",
      steps: [],
      goal: { child: "", adult: "" },
      isNew: true
    });

    expect(createStep("step_2")).toEqual({
      id: "step_2",
      question: "",
      answers: { child: "", adult: "" },
      mentions: [],
      summary: { child: "", adult: "" },
      check: null
    });

    expect(createTemplateStep(0)).toMatchObject({
      id: "step_1",
      question: "是什么（What）",
      check: null
    });
  });

  it("finds the next available step id", () => {
    expect(getNextStepId([createStep("step_1"), createStep("step_3")])).toBe("step_4");
  });
});
