import { useEffect, useMemo, useReducer, useRef, type ReactElement } from "react";
import {
  getNodeById,
  loadExamples,
  pushCard,
  goToBreadcrumb,
  reduceCardStack,
  setStack,
  type Node,
  type CardStackState
} from "@lxp/core";
import { NodeCard } from "@lxp/renderer-web";
import "./styles.css";
import { formatStackToSearch, parseStackFromLocation } from "./urlStack";

const getTitle = (node: Node | undefined): string => node?.title ?? "Unknown";

export const App = (): ReactElement => {
  const nodes = useMemo(() => loadExamples(), []);
  const [state, dispatch] = useReducer(
    reduceCardStack,
    { stack: ["plant_cell"] } satisfies CardStackState,
    () => ({ stack: parseStackFromLocation(window.location.search) })
  );
  const lastSearchRef = useRef<string>("");

  const current = getNodeById(state.stack[state.stack.length - 1], nodes);
  const previous =
    state.stack.length >= 2
      ? getNodeById(state.stack[state.stack.length - 2], nodes)
      : current;

  const handleMentionClick = (nodeId: string) => {
    dispatch(pushCard(nodeId));
  };

  const handleBreadcrumbClick = (index: number) => {
    dispatch(goToBreadcrumb(index));
  };

  useEffect(() => {
    const handlePopstate = () => {
      const parsed = parseStackFromLocation(window.location.search);
      dispatch(setStack(parsed));
    };

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  useEffect(() => {
    const nextSearch = formatStackToSearch(state.stack);
    if (nextSearch === lastSearchRef.current) {
      return;
    }

    const url = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.replaceState({ stack: state.stack }, "", url);
    lastSearchRef.current = nextSearch;
  }, [state.stack]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Learning Experience Engine</h1>
        <nav className="breadcrumb">
          {state.stack.map((id, index) => {
            const node = getNodeById(id, nodes);
            const isLast = index === state.stack.length - 1;
            return (
              <button
                key={`${id}-${index}`}
                type="button"
                className={`breadcrumb__item${isLast ? " is-active" : ""}`}
                onClick={() => handleBreadcrumbClick(index)}
              >
                {getTitle(node)}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="app__content">
        <section className="column">
          {previous ? (
            <NodeCard
              node={previous}
              onMentionClick={handleMentionClick}
              onRelationClick={handleMentionClick}
              onNodeClick={handleMentionClick}
            />
          ) : (
            <div className="empty">No node</div>
          )}
        </section>
        <section className="column">
          {state.stack.length >= 2 && current ? (
            <NodeCard
              node={current}
              onMentionClick={handleMentionClick}
              onRelationClick={handleMentionClick}
              onNodeClick={handleMentionClick}
            />
          ) : (
            <div className="empty">点击左侧术语以展开</div>
          )}
        </section>
      </main>
    </div>
  );
};
