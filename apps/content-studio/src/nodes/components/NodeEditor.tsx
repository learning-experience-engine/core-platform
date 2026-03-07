import type { Facet, Node, RelationType } from "@lxp/schema";
import { FACETS, RELATION_TYPES } from "../../constants";
import { buildNodeMentionPath, buildLintTargetKey, formatLintMessage } from "../../lint/targets";
import type { LintIssue } from "../../lint/types";
import type { DraftNode, MentionSuggestion } from "../../types";
import { classNames } from "../../utils/classNames";
import { makeId, makeUniqueId, titleToId } from "../../utils/ids";
import { updateBody } from "../draft";

type NodeEditorProps = {
  draft: DraftNode;
  nodes: Node[];
  nodeErrors: string[];
  lintFocusTarget: string;
  nodeSuggestions: MentionSuggestion[];
  facetCoverage: Map<Facet, number>;
  relationTypeCoverage: Map<RelationType, number>;
  getLintIssuesForTarget: (key: string) => LintIssue[];
  registerLintTarget: (key: string) => (node: HTMLElement | null) => void;
  onDraftChange: (next: DraftNode) => void;
};

export function NodeEditor({
  draft,
  nodes,
  nodeErrors,
  lintFocusTarget,
  nodeSuggestions,
  facetCoverage,
  relationTypeCoverage,
  getLintIssuesForTarget,
  registerLintTarget,
  onDraftChange
}: NodeEditorProps) {
  const nodeIdTarget = buildLintTargetKey("node", draft.id, "id");
  const nodeTitleTarget = buildLintTargetKey("node", draft.id, "title");
  const nodeBodyTarget = buildLintTargetKey("node", draft.id, "body");
  const nodeMentionsTarget = buildLintTargetKey("node", draft.id, "mentions");

  const nodeIdIssues = getLintIssuesForTarget(nodeIdTarget);
  const nodeTitleIssues = getLintIssuesForTarget(nodeTitleTarget);
  const nodeBodyIssues = getLintIssuesForTarget(nodeBodyTarget);

  return (
    <div className="form">
      {nodeErrors.length > 0 && (
        <div className="form__errors">
          <strong>请先修正以下问题：</strong>
          <ul>
            {nodeErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <label>
        <span>ID</span>
        <input
          value={draft.id}
          data-lint-target={nodeIdTarget}
          ref={registerLintTarget(nodeIdTarget)}
          className={classNames(
            nodeIdIssues.length > 0 && "input--error",
            lintFocusTarget === nodeIdTarget && "input--lint-focus"
          )}
          onChange={(event) => onDraftChange({ ...draft, id: event.target.value })}
        />
        {draft.isNew && <span className="form__hint">未保存</span>}
        {nodeIdIssues.length > 0 && (
          <span className="form__hint form__hint--error">{formatLintMessage(nodeIdIssues[0])}</span>
        )}
      </label>
      <label>
        <span>Title</span>
        <input
          value={draft.title}
          data-lint-target={nodeTitleTarget}
          ref={registerLintTarget(nodeTitleTarget)}
          className={classNames(
            nodeTitleIssues.length > 0 && "input--error",
            lintFocusTarget === nodeTitleTarget && "input--lint-focus"
          )}
          onChange={(event) => {
            const nextTitle = event.target.value;
            let nextId = draft.id;
            if (draft.isNew) {
              const baseFromTitle = titleToId(nextTitle);
              const shouldUpdate =
                !draft.id || draft.id.startsWith("node_") || draft.id === titleToId(draft.title);
              if (baseFromTitle && shouldUpdate) {
                const existing = new Set(nodes.map((node) => node.id));
                nextId = makeUniqueId(baseFromTitle, existing);
              }
            }
            onDraftChange({ ...draft, title: nextTitle, id: nextId });
          }}
        />
        {nodeTitleIssues.length > 0 && (
          <span className="form__hint form__hint--error">{formatLintMessage(nodeTitleIssues[0])}</span>
        )}
      </label>
      <label>
        <span>Aliases</span>
        <textarea
          rows={3}
          placeholder="One alias per line"
          value={draft.aliasesText}
          onChange={(event) => onDraftChange({ ...draft, aliasesText: event.target.value })}
        />
      </label>
      <label>
        <span>Body</span>
        <textarea
          rows={6}
          value={draft.bodyText}
          data-lint-target={nodeBodyTarget}
          ref={registerLintTarget(nodeBodyTarget)}
          className={classNames(
            nodeBodyIssues.length > 0 && "input--error",
            lintFocusTarget === nodeBodyTarget && "input--lint-focus"
          )}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              bodyText: event.target.value,
              body: updateBody(draft.body, event.target.value)
            })
          }
        />
        {nodeBodyIssues.length > 0 && (
          <span className="form__hint form__hint--error">{formatLintMessage(nodeBodyIssues[0])}</span>
        )}
      </label>

      <div className="form__section">
        <div className="form__section-header">
          <h3>Coverage</h3>
        </div>
        <div className="coverage">
          {FACETS.map((facet) => {
            const count = facetCoverage.get(facet) ?? 0;
            return (
              <div
                key={facet}
                className={classNames("coverage__item", count === 0 && "coverage__item--missing")}
              >
                <span>{facet}</span>
                <span>
                  {count} {count === 0 ? "(missing)" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="coverage coverage--types">
          {RELATION_TYPES.map((type) => {
            const count = relationTypeCoverage.get(type) ?? 0;
            return (
              <div key={type} className="coverage__item coverage__item--compact">
                <span>{type}</span>
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={classNames(
          "form__section",
          lintFocusTarget === nodeMentionsTarget && "lint-focus"
        )}
        data-lint-target={nodeMentionsTarget}
        ref={registerLintTarget(nodeMentionsTarget)}
        tabIndex={-1}
      >
        <div className="form__section-header">
          <h3>Mentions</h3>
          <button
            type="button"
            className="button button--ghost"
            onClick={() =>
              onDraftChange({
                ...draft,
                mentions: [...draft.mentions, { id: makeId(), term: "", targetId: "" }]
              })
            }
          >
            Add
          </button>
        </div>
        {draft.mentions.length === 0 ? (
          <p className="form__empty">No mentions</p>
        ) : (
          <div className="grid">
            {draft.mentions.map((row) => {
              const mentionPath = row.term ? buildNodeMentionPath(row.term) : "";
              const mentionTarget = buildLintTargetKey("node", draft.id, mentionPath);
              const mentionIssues = mentionPath ? getLintIssuesForTarget(mentionTarget) : [];
              return (
                <div key={row.id}>
                  <div className="grid__row">
                    <input
                      placeholder="Term"
                      value={row.term}
                      className={classNames(
                        mentionIssues.length > 0 && "input--error",
                        lintFocusTarget === mentionTarget && "input--lint-focus"
                      )}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          mentions: draft.mentions.map((item) =>
                            item.id === row.id ? { ...item, term: event.target.value } : item
                          )
                        })
                      }
                    />
                    <input
                      list="node-ids"
                      placeholder="Target node id"
                      value={row.targetId}
                      data-lint-target={mentionPath ? mentionTarget : undefined}
                      ref={mentionPath ? registerLintTarget(mentionTarget) : undefined}
                      className={classNames(
                        mentionIssues.length > 0 && "input--error",
                        lintFocusTarget === mentionTarget && "input--lint-focus"
                      )}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          mentions: draft.mentions.map((item) =>
                            item.id === row.id ? { ...item, targetId: event.target.value } : item
                          )
                        })
                      }
                    />
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          mentions: draft.mentions.filter((item) => item.id !== row.id)
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  {mentionIssues.length > 0 && (
                    <span className="form__hint form__hint--error">
                      {formatLintMessage(mentionIssues[0])}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="form__section">
        <div className="form__section-header">
          <h3>Mention Suggestions</h3>
        </div>
        {nodeSuggestions.length === 0 ? (
          <p className="form__empty">No suggestions</p>
        ) : (
          <div className="suggestion-list">
            {nodeSuggestions.map((suggestion) => (
              <div key={`${suggestion.term}-${suggestion.targetId}`} className="suggestion">
                <div>
                  <strong>{suggestion.term}</strong>
                  <span>→ {suggestion.targetTitle}</span>
                </div>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() =>
                    onDraftChange({
                      ...draft,
                      mentions: [
                        ...draft.mentions,
                        {
                          id: makeId(),
                          term: suggestion.term,
                          targetId: suggestion.targetId
                        }
                      ]
                    })
                  }
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form__section">
        <div className="form__section-header">
          <h3>Relations</h3>
          <button
            type="button"
            className="button button--ghost"
            onClick={() =>
              onDraftChange({
                ...draft,
                relations: [
                  ...draft.relations,
                  {
                    id: makeId(),
                    type: "related",
                    facet: "what",
                    to: "",
                    label: ""
                  }
                ]
              })
            }
          >
            Add
          </button>
        </div>
        {draft.relations.length === 0 ? (
          <p className="form__empty">No relations</p>
        ) : (
          <div className="grid grid--relations">
            {draft.relations.map((row, index) => {
              const relationRowTarget = buildLintTargetKey("node", draft.id, `relations[${index}]`);
              const typeTarget = buildLintTargetKey("node", draft.id, `relations[${index}].type`);
              const facetTarget = buildLintTargetKey("node", draft.id, `relations[${index}].facet`);
              const toTarget = buildLintTargetKey("node", draft.id, `relations[${index}].to`);
              const relationIssues = [
                ...getLintIssuesForTarget(typeTarget),
                ...getLintIssuesForTarget(facetTarget),
                ...getLintIssuesForTarget(toTarget)
              ];
              return (
                <div key={row.id}>
                  <div
                    className={classNames(
                      "grid__row",
                      lintFocusTarget === relationRowTarget && "lint-focus"
                    )}
                    data-lint-target={relationRowTarget}
                    ref={registerLintTarget(relationRowTarget)}
                    tabIndex={-1}
                  >
                    <select
                      value={row.type}
                      data-lint-target={typeTarget}
                      ref={registerLintTarget(typeTarget)}
                      className={classNames(
                        getLintIssuesForTarget(typeTarget).length > 0 && "input--error",
                        lintFocusTarget === typeTarget && "input--lint-focus"
                      )}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          relations: draft.relations.map((item) =>
                            item.id === row.id
                              ? { ...item, type: event.target.value as RelationType }
                              : item
                          )
                        })
                      }
                    >
                      {RELATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <select
                      value={row.facet}
                      data-lint-target={facetTarget}
                      ref={registerLintTarget(facetTarget)}
                      className={classNames(
                        getLintIssuesForTarget(facetTarget).length > 0 && "input--error",
                        lintFocusTarget === facetTarget && "input--lint-focus"
                      )}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          relations: draft.relations.map((item) =>
                            item.id === row.id ? { ...item, facet: event.target.value as Facet } : item
                          )
                        })
                      }
                    >
                      {FACETS.map((facet) => (
                        <option key={facet} value={facet}>
                          {facet}
                        </option>
                      ))}
                    </select>
                    <input
                      list="node-ids"
                      placeholder="Target node id"
                      value={row.to}
                      data-lint-target={toTarget}
                      ref={registerLintTarget(toTarget)}
                      className={classNames(
                        getLintIssuesForTarget(toTarget).length > 0 && "input--error",
                        lintFocusTarget === toTarget && "input--lint-focus"
                      )}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          relations: draft.relations.map((item) =>
                            item.id === row.id ? { ...item, to: event.target.value } : item
                          )
                        })
                      }
                    />
                    <input
                      placeholder="Label (optional)"
                      value={row.label}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          relations: draft.relations.map((item) =>
                            item.id === row.id ? { ...item, label: event.target.value } : item
                          )
                        })
                      }
                    />
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          relations: draft.relations.filter((item) => item.id !== row.id)
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  {relationIssues.length > 0 && (
                    <span className="form__hint form__hint--error">
                      {formatLintMessage(relationIssues[0])}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
