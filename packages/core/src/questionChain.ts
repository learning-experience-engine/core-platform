import type { AgeBand } from "@lxp/schema";

export type QuestionChainState = {
  chainId: string;
  stepIndex: number;
  age: AgeBand;
};

export type QuestionChainAction =
  | { type: "SET_CHAIN"; chainId: string }
  | { type: "SET_STEP"; index: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SET_AGE"; age: AgeBand }
  | { type: "EXIT" };

export type QuestionChainContext = {
  stepCount: number;
  defaultAge?: AgeBand;
  defaultChainId?: string;
};

const clampIndex = (index: number, stepCount: number): number => {
  if (stepCount <= 0) return 0;
  if (index < 0) return 0;
  const last = stepCount - 1;
  return index > last ? last : index;
};

export const createQuestionChainState = (
  context: QuestionChainContext,
  initial?: Partial<QuestionChainState>
): QuestionChainState => {
  const chainId = initial?.chainId ?? context.defaultChainId ?? "";
  const age = initial?.age ?? context.defaultAge ?? "child";
  const stepIndex = clampIndex(initial?.stepIndex ?? 0, context.stepCount);
  return { chainId, stepIndex, age };
};

export const reduceQuestionChain = (
  state: QuestionChainState,
  action: QuestionChainAction,
  context: QuestionChainContext
): QuestionChainState => {
  switch (action.type) {
    case "SET_CHAIN":
      return {
        chainId: action.chainId,
        stepIndex: 0,
        age: state.age
      };
    case "SET_STEP":
      return {
        ...state,
        stepIndex: clampIndex(action.index, context.stepCount)
      };
    case "NEXT":
      return {
        ...state,
        stepIndex: clampIndex(state.stepIndex + 1, context.stepCount)
      };
    case "PREV":
      return {
        ...state,
        stepIndex: clampIndex(state.stepIndex - 1, context.stepCount)
      };
    case "SET_AGE":
      return {
        ...state,
        age: action.age
      };
    case "EXIT":
      return {
        chainId: "",
        stepIndex: 0,
        age: state.age
      };
    default:
      return state;
  }
};

export const setChain = (chainId: string): QuestionChainAction => ({
  type: "SET_CHAIN",
  chainId
});

export const setStep = (index: number): QuestionChainAction => ({
  type: "SET_STEP",
  index
});

export const nextStep = (): QuestionChainAction => ({ type: "NEXT" });

export const prevStep = (): QuestionChainAction => ({ type: "PREV" });

export const setAge = (age: AgeBand): QuestionChainAction => ({ type: "SET_AGE", age });

export const exitChain = (): QuestionChainAction => ({ type: "EXIT" });
