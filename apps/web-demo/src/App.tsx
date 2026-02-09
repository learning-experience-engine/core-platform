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
import { GraphMini, NodeCard } from "@lxp/renderer-web";
import "./styles.css";
import { formatStackToSearch, parseStackFromLocation } from "./urlStack";
import type { Facet } from "@lxp/schema";

const getTitle = (node: Node | undefined): string => node?.title ?? "Unknown";

const FACETS: Facet[] = ["what", "how", "in_life", "compare", "practice"];
const FACET_LABELS: Record<Facet, string> = {
  what: "是什么",
  how: "怎么实现",
  in_life: "生活体现",
  compare: "差异对比",
  practice: "动手实践"
};

type NeighborhoodPanelProps = {
  centerId: string;
  nodesById: Record<string, Node>;
  onNavigate?: (nodeId: string) => void;
};

const NeighborhoodPanel = ({ centerId, nodesById, onNavigate }: NeighborhoodPanelProps) => {
  const [facet, setFacet] = useReducer(
    (_: Facet | "all", next: Facet | "all") => next,
    "all"
  );
  const [view, setView] = useReducer(
    (_: "graph" | "list", next: "graph" | "list") => next,
    "graph"
  );

  return (
    <div className="neighborhood">
      <div className="neighborhood__controls">
        <div className="neighborhood__tabs" role="tablist" aria-label="Facet filter">
          {["all", ...FACETS].map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={facet === key}
              className={`neighborhood__tab${facet === key ? " is-active" : ""}`}
              onClick={() => setFacet(key as Facet | "all")}
            >
              {key === "all" ? "All" : FACET_LABELS[key as Facet]}
            </button>
          ))}
        </div>
        <div className="neighborhood__view" role="group" aria-label="View mode">
          <button
            type="button"
            className={`neighborhood__view-btn${view === "graph" ? " is-active" : ""}`}
            onClick={() => setView("graph")}
          >
            Graph view
          </button>
          <button
            type="button"
            className={`neighborhood__view-btn${view === "list" ? " is-active" : ""}`}
            onClick={() => setView("list")}
          >
            List view
          </button>
        </div>
      </div>
      <GraphMini centerId={centerId} nodesById={nodesById} facet={facet} view={view} onNavigate={onNavigate} />
    </div>
  );
};

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
              neighborhood={
                <NeighborhoodPanel
                  centerId={previous.id}
                  nodesById={nodesById}
                  onNavigate={handleMentionClick}
                />
              }
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
              neighborhood={
                <NeighborhoodPanel
                  centerId={current.id}
                  nodesById={nodesById}
                  onNavigate={handleMentionClick}
                />
              }
            />
          ) : (
            <div className="empty">点击左侧术语以展开</div>
          )}
        </section>
      </main>
    </div>
  );
};
