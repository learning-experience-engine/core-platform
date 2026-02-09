import { useEffect, useMemo, useReducer, useRef, type ReactElement } from "react";
import {
  getNodeById,
  loadExamples,
  reduceCardStack,
  setStack,
  push,
  getTop,
  getPrev,
  getBreadcrumb,
  DEFAULT_ROOT_ID,
  type Node,
  type CardStackState
} from "@lxp/core";
import { NodeCard } from "@lxp/renderer-web";
import "./styles.css";
import { formatStackToSearch, parseStackFromLocation } from "./urlStack";

const getTitle = (node: Node | undefined): string => node?.title ?? "Unknown";

export const App = (): ReactElement => {
  const nodes = useMemo(() => loadExamples(), []);
  const nodesById = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])),
    [nodes]
  );
  const [state, dispatch] = useReducer(
    reduceCardStack,
    { stack: ["plant_cell"] } satisfies CardStackState,
    () => ({ stack: parseStackFromLocation(window.location.search) })
  );
  const lastSearchRef = useRef<string>("");

  const currentId = getTop(state) ?? DEFAULT_ROOT_ID;
  const prevId = getPrev(state) ?? currentId;
  const current = getNodeById(currentId, nodes);
  const previous = getNodeById(prevId, nodes);
  const breadcrumb = getBreadcrumb(state);

  const handleMentionClick = (nodeId: string) => {
    dispatch(push(nodeId));
  };

  const handleBreadcrumbClick = (index: number) => {
    dispatch(setStack(breadcrumb.slice(0, index + 1)));
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
          {breadcrumb.map((id, index) => {
            const node = getNodeById(id, nodes);
            const isLast = index === breadcrumb.length - 1;
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
              nodesById={nodesById}
              onMentionClick={handleMentionClick}
              onRelationClick={handleMentionClick}
              onNodeClick={handleMentionClick}
              onNavigate={handleMentionClick}
            />
          ) : (
            <div className="empty">No node</div>
          )}
        </section>
        <section className="column">
          {breadcrumb.length >= 2 && current ? (
            <NodeCard
              node={current}
              nodesById={nodesById}
              onMentionClick={handleMentionClick}
              onRelationClick={handleMentionClick}
              onNodeClick={handleMentionClick}
              onNavigate={handleMentionClick}
            />
          ) : (
            <div className="empty">点击左侧术语以展开</div>
          )}
        </section>
      </main>
    </div>
  );
};
