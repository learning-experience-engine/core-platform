export type CardStackState = {
  stack: string[];
};

export type CardStackAction =
  | { type: "push"; nodeId: string }
  | { type: "pop" }
  | { type: "reset"; nodeId: string }
  | { type: "breadcrumb"; index: number }
  | { type: "set"; stack: string[] };

export const reduceCardStack = (
  state: CardStackState,
  action: CardStackAction
): CardStackState => {
  switch (action.type) {
    case "push":
      return { stack: [...state.stack, action.nodeId] };
    case "pop":
      return state.stack.length > 1
        ? { stack: state.stack.slice(0, -1) }
        : state;
    case "reset":
      return { stack: [action.nodeId] };
    case "breadcrumb": {
      const nextIndex = Math.min(Math.max(action.index, 0), state.stack.length - 1);
      return { stack: state.stack.slice(0, nextIndex + 1) };
    }
    case "set":
      return action.stack.length ? { stack: [...action.stack] } : state;
    default:
      return state;
  }
};

export const pushCard = (nodeId: string): CardStackAction => ({
  type: "push",
  nodeId
});

export const popCard = (): CardStackAction => ({ type: "pop" });

export const resetStack = (nodeId: string): CardStackAction => ({
  type: "reset",
  nodeId
});

export const goToBreadcrumb = (index: number): CardStackAction => ({
  type: "breadcrumb",
  index
});

export const setStack = (stack: string[]): CardStackAction => ({
  type: "set",
  stack
});
