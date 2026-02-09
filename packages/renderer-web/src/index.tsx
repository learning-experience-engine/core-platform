import type { Facet, Node, Relation, RelationType } from "@lxp/schema";
import { getNeighborhood, type GraphEdge, type Neighborhood } from "@lxp/graph";
import React from "react";

export type NodeCardProps = {
  node: Node;
  onMentionClick?: (nodeId: string) => void;
  onRelationClick?: (nodeId: string) => void;
  onNodeClick?: (nodeId: string) => void;
};

type RelationDockProps = {
  relations: Relation[];
  onRelationClick?: (nodeId: string) => void;
};

type GraphMiniProps = {
  nodeId: string;
  limit?: number;
  onNodeClick?: (nodeId: string) => void;
};

const FACETS: Facet[] = ["what", "how", "in_life", "compare", "practice"];
const RELATION_TYPES: RelationType[] = ["part_of", "compare_with", "related"];

const FACET_LABELS: Record<Facet, string> = {
  what: "What",
  how: "How",
  in_life: "In Life",
  compare: "Compare",
  practice: "Practice"
};

const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV ?? false;

const getEdgeLabel = (edge: GraphEdge) => `${edge.relation.type}:${edge.targetId}`;

const buildNeighbors = (neighborhood: Neighborhood, sourceId: string) =>
  neighborhood.nodes.filter((node) => node.id !== sourceId);

const groupRelations = (relations: Relation[]) => {
  const grouped = new Map<Facet, Map<RelationType, Relation[]>>();

  relations.forEach((rel) => {
    const facet = rel.facet;
    const type = rel.type;
    if (!grouped.has(facet)) {
      grouped.set(facet, new Map());
    }
    const typeMap = grouped.get(facet);
    if (!typeMap) return;
    if (!typeMap.has(type)) {
      typeMap.set(type, []);
    }
    typeMap.get(type)?.push(rel);
  });

  return grouped;
};

const warnOnUnknown = (relations: Relation[]) => {
  if (!isDev) return;
  relations.forEach((rel) => {
    if (!FACETS.includes(rel.facet)) {
      console.warn("[renderer-web] Unknown facet:", rel.facet, rel);
    }
    if (!RELATION_TYPES.includes(rel.type)) {
      console.warn("[renderer-web] Unknown relation type:", rel.type, rel);
    }
  });
};

export const RelationDock: React.FC<RelationDockProps> = ({ relations, onRelationClick }) => {
  if (relations.length === 0) {
    return <p className="node-card__empty">No relations</p>;
  }

  warnOnUnknown(relations);
  const grouped = groupRelations(relations);

  return (
    <div className="relation-dock">
      {[...grouped.entries()].map(([facet, typeMap]) => (
        <section key={facet} className="relation-dock__facet">
          <h4>{FACET_LABELS[facet] ?? facet}</h4>
          {[...typeMap.entries()].map(([type, items]) => (
            <div key={type} className="relation-dock__type">
              <h5>{type}</h5>
              <ul>
                {items.map((rel, index) => (
                  <li key={`${rel.targetId}-${index}`}>
                    <button
                      type="button"
                      className="relation-link"
                      onClick={() => onRelationClick?.(rel.targetId)}
                    >
                      {rel.targetId}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

export const GraphMini: React.FC<GraphMiniProps> = ({ nodeId, limit = 8, onNodeClick }) => {
  const [facet, setFacet] = React.useState<Facet | "all">("all");
  const [mode, setMode] = React.useState<"graph" | "list">("graph");

  const neighborhood = React.useMemo(
    () => getNeighborhood(nodeId, facet === "all" ? undefined : facet, limit),
    [nodeId, facet, limit]
  );

  const neighbors = React.useMemo(() => buildNeighbors(neighborhood, nodeId), [neighborhood, nodeId]);
  const hasMore = (getNeighborhood(nodeId, facet === "all" ? undefined : facet, Number.MAX_SAFE_INTEGER).edges.length ?? 0) > limit;

  return (
    <section className="graph-mini" aria-label="Neighborhood graph">
      <header className="graph-mini__header">
        <div className="graph-mini__tabs" role="tablist" aria-label="Facet filter">
          {["all", ...FACETS].map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={facet === key}
              className={`graph-mini__tab${facet === key ? " is-active" : ""}`}
              onClick={() => setFacet(key as Facet | "all")}
            >
              {key === "all" ? "All" : FACET_LABELS[key as Facet]}
            </button>
          ))}
        </div>
        <div className="graph-mini__mode" role="group" aria-label="View mode">
          <button
            type="button"
            className={`graph-mini__mode-btn${mode === "graph" ? " is-active" : ""}`}
            onClick={() => setMode("graph")}
          >
            Graph view
          </button>
          <button
            type="button"
            className={`graph-mini__mode-btn${mode === "list" ? " is-active" : ""}`}
            onClick={() => setMode("list")}
          >
            List view
          </button>
        </div>
      </header>

      {mode === "list" ? (
        <ul className="graph-mini__list">
          {neighbors.map((node) => (
            <li key={node.id}>
              <button type="button" className="graph-mini__node" onClick={() => onNodeClick?.(node.id)}>
                {node.title}
              </button>
            </li>
          ))}
          {hasMore ? <li className="graph-mini__more">+more</li> : null}
        </ul>
      ) : (
        <div className="graph-mini__grid" role="img" aria-label="Neighborhood layout">
          <button type="button" className="graph-mini__node is-center" onClick={() => onNodeClick?.(nodeId)}>
            {nodeId}
          </button>
          {neighbors.map((node) => (
            <button
              key={node.id}
              type="button"
              className="graph-mini__node"
              onClick={() => onNodeClick?.(node.id)}
            >
              {node.title}
            </button>
          ))}
          {hasMore ? <span className="graph-mini__more">+more</span> : null}
        </div>
      )}

      <div className="graph-mini__edges" aria-hidden="true">
        {neighborhood.edges.map((edge) => (
          <span key={getEdgeLabel(edge)} className="graph-mini__edge">
            {edge.sourceId} → {edge.targetId}
          </span>
        ))}
      </div>
    </section>
  );
};

const renderBody = (
  body: string,
  mentions: Record<string, string>,
  onMentionClick?: (nodeId: string) => void
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /\[(.+?)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body))) {
    const [raw, term] = match;
    const start = match.index;
    const end = start + raw.length;

    if (start > lastIndex) {
      parts.push(body.slice(lastIndex, start));
    }

    const targetId = mentions[term];
    if (targetId && onMentionClick) {
      parts.push(
        <button
          key={`${term}-${start}`}
          type="button"
          className="mention"
          onClick={() => onMentionClick(targetId)}
        >
          {term}
        </button>
      );
    } else {
      parts.push(term);
    }

    lastIndex = end;
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return parts;
};

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  onMentionClick,
  onRelationClick,
  onNodeClick
}) => {
  return (
    <article className="node-card">
      <header className="node-card__header">
        <h2>{node.title}</h2>
      </header>
      <p className="node-card__body">{renderBody(node.body, node.mentions, onMentionClick)}</p>
      <footer className="node-card__footer">
        <div className="node-card__relations">
          <h3>Relations</h3>
          <RelationDock relations={node.relations} onRelationClick={onRelationClick} />
        </div>
        <div className="node-card__graph">
          <h3>Neighborhood</h3>
          <GraphMini nodeId={node.id} onNodeClick={onNodeClick ?? onRelationClick} />
        </div>
      </footer>
    </article>
  );
};
