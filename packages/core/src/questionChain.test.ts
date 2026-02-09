import { describe, expect, it } from "vitest";
import {
  createQuestionChainState,
  reduceQuestionChain,
  nextStep,
  prevStep,
  setStep,
  setAge,
  type QuestionChainContext
} from "./questionChain";

describe("question chain", () => {
  const context: QuestionChainContext = {
    stepCount: 3,
    defaultChainId: "plant_cell_intro",
    defaultAge: "child"
  };

  it("next and prev respect boundaries", () => {
    const base = createQuestionChainState(context, { stepIndex: 0 });
    const prev = reduceQuestionChain(base, prevStep(), context);
    expect(prev.stepIndex).toBe(0);

    const nearEnd = createQuestionChainState(context, { stepIndex: 2 });
    const next = reduceQuestionChain(nearEnd, nextStep(), context);
    expect(next.stepIndex).toBe(2);
  });

  it("setStep clamps out-of-range", () => {
    const base = createQuestionChainState(context, { stepIndex: 1 });
    const low = reduceQuestionChain(base, setStep(-3), context);
    const high = reduceQuestionChain(base, setStep(99), context);
    expect(low.stepIndex).toBe(0);
    expect(high.stepIndex).toBe(2);
  });

  it("setAge switches age band", () => {
    const base = createQuestionChainState(context, { age: "child" });
    const next = reduceQuestionChain(base, setAge("adult"), context);
    expect(next.age).toBe("adult");
  });
});
