export type NodeId = string;

export const DEFAULT_ROOT_ID: NodeId = "plant_cell";

export type CardStackState = {
  stack: NodeId[];
};

export type CardStackAction =
  | { type: "SET_STACK"; stack: NodeId[] }
  | { type: "PUSH"; id: NodeId }
  | { type: "POP" }
  | { type: "RESET"; id: NodeId };

export const reduceCardStack = (state: CardStackState, action: CardStackAction): CardStackState => {
  switch (action.type) {
    case "PUSH": {
      const top = state.stack[state.stack.length - 1];
      if (top === action.id) {
        return state;
      }
      return { stack: [...state.stack, action.id] };
    }
    case "POP":
      return state.stack.length > 1
        ? { stack: state.stack.slice(0, -1) }
        : state;
    case "RESET":
      return { stack: [action.id] };
    case "SET_STACK":
      return action.stack.length ? { stack: [...action.stack] } : { stack: [DEFAULT_ROOT_ID] };
    default:
      return state;
  }
};

export const setStack = (stack: NodeId[]): CardStackAction => ({
  type: "SET_STACK",
  stack
});

export const push = (id: NodeId): CardStackAction => ({
  type: "PUSH",
  id
});

export const pop = (): CardStackAction => ({ type: "POP" });

export const reset = (id: NodeId): CardStackAction => ({
  type: "RESET",
  id
});

export const getTop = (state: CardStackState): NodeId | undefined =>
  state.stack[state.stack.length - 1];

export const getPrev = (state: CardStackState): NodeId | undefined =>
  state.stack.length >= 2 ? state.stack[state.stack.length - 2] : undefined;

export const getBreadcrumb = (state: CardStackState): NodeId[] => state.stack;
