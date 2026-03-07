import type { Node } from "@lxp/schema";
import { AGE_BANDS } from "../../constants";
import { buildLintTargetKey, formatLintMessage } from "../../lint/targets";
import type { LintIssue } from "../../lint/types";
import type { DraftChain } from "../../types";
import { classNames } from "../../utils/classNames";
import { makeUniqueId, titleToId } from "../../utils/ids";
import { createStep, getNextStepId } from "../draft";
import { ChainStepsSection } from "./ChainStepsSection";

type ChainEditorProps = {
  draft: DraftChain;
  chains: Array<{ id: string }>;
  nodes: Node[];
  chainErrors: string[];
  lintFocusTarget: string;
  chainStats: {
    stepCount: number;
    mentionCount: number;
    missingMentionSteps: Array<{ id: string; index: number; count: number }>;
  };
  getLintIssuesForTarget: (key: string) => LintIssue[];
  registerLintTarget: (key: string) => (node: HTMLElement | null) => void;
  onDraftChange: (next: DraftChain) => void;
};

export function ChainEditor({
  draft,
  chains,
  nodes,
  chainErrors,
  lintFocusTarget,
  chainStats,
  getLintIssuesForTarget,
  registerLintTarget,
  onDraftChange
}: ChainEditorProps) {
  const chainIdTarget = buildLintTargetKey("chain", draft.id, "id");
  const chainTitleTarget = buildLintTargetKey("chain", draft.id, "title");
  const chainTopicTarget = buildLintTargetKey("chain", draft.id, "topicNodeId");

  const chainIdIssues = getLintIssuesForTarget(chainIdTarget);
  const chainTitleIssues = getLintIssuesForTarget(chainTitleTarget);
  const chainTopicIssues = getLintIssuesForTarget(chainTopicTarget);

  return (
    <div className="form">
      {chainErrors.length > 0 && (
        <div className="form__errors">
          <strong>请先修正以下问题：</strong>
          <ul>
            {chainErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <label>
        <span>Chain ID</span>
        <input
          value={draft.id}
          readOnly={!draft.isNew}
          data-lint-target={chainIdTarget}
          ref={registerLintTarget(chainIdTarget)}
          className={classNames(
            chainIdIssues.length > 0 && "input--error",
            lintFocusTarget === chainIdTarget && "input--lint-focus"
          )}
          onChange={(event) => onDraftChange({ ...draft, id: event.target.value })}
        />
        {chainIdIssues.length > 0 && (
          <span className="form__hint form__hint--error">{formatLintMessage(chainIdIssues[0])}</span>
        )}
      </label>
      <label>
        <span>Title</span>
        <input
          value={draft.title}
          data-lint-target={chainTitleTarget}
          ref={registerLintTarget(chainTitleTarget)}
          className={classNames(
            chainTitleIssues.length > 0 && "input--error",
            lintFocusTarget === chainTitleTarget && "input--lint-focus"
          )}
          onChange={(event) => {
            const nextTitle = event.target.value;
            let nextId = draft.id;
            if (draft.isNew) {
              const baseFromTitle = titleToId(nextTitle);
              const shouldUpdate =
                !draft.id || draft.id.startsWith("chain_") || draft.id === titleToId(draft.title);
              if (baseFromTitle && shouldUpdate) {
                const existing = new Set(chains.map((chain) => chain.id));
                nextId = makeUniqueId(baseFromTitle, existing);
              }
            }
            onDraftChange({ ...draft, title: nextTitle, id: nextId });
          }}
        />
        {chainTitleIssues.length > 0 && (
          <span className="form__hint form__hint--error">{formatLintMessage(chainTitleIssues[0])}</span>
        )}
      </label>
      <label>
        <span>Topic Node</span>
        <input
          list="node-ids"
          placeholder="topicNodeId"
          value={draft.topicNodeId}
          data-lint-target={chainTopicTarget}
          ref={registerLintTarget(chainTopicTarget)}
          className={classNames(
            !draft.topicNodeId.trim() && "input--error",
            chainTopicIssues.length > 0 && "input--error",
            lintFocusTarget === chainTopicTarget && "input--lint-focus"
          )}
          onChange={(event) => onDraftChange({ ...draft, topicNodeId: event.target.value })}
        />
        {!draft.topicNodeId.trim() && (
          <span className="form__hint form__hint--error">Topic node 不能为空</span>
        )}
        {chainTopicIssues.length > 0 && (
          <span className="form__hint form__hint--error">
            {formatLintMessage(chainTopicIssues[0])}
          </span>
        )}
      </label>

      <div className="form__section">
        <div className="form__section-header">
          <h3>Goal</h3>
        </div>
        <div className="grid grid--answers">
          {AGE_BANDS.map((age) => (
            <label key={`goal-${age}`}>
              <span>Goal ({age})</span>
              <textarea
                rows={2}
                value={draft.goal[age]}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    goal: { ...draft.goal, [age]: event.target.value }
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className="form__section">
        <div className="form__section-header">
          <h3>Chain stats</h3>
        </div>
        <div className="coverage">
          <div className="coverage__item coverage__item--compact">
            <span>steps</span>
            <span>{chainStats.stepCount}</span>
          </div>
          <div className="coverage__item coverage__item--compact">
            <span>mentions</span>
            <span>{chainStats.mentionCount}</span>
          </div>
        </div>
        {chainStats.missingMentionSteps.length > 0 && (
          <div className="coverage coverage--missing">
            {chainStats.missingMentionSteps.map((step) => (
              <div key={step.id} className="coverage__item coverage__item--missing">
                <span>{step.id}</span>
                <span>mentions missing</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ChainStepsSection
        chainId={draft.id}
        steps={draft.steps}
        nodes={nodes}
        lintFocusTarget={lintFocusTarget}
        getLintIssuesForTarget={getLintIssuesForTarget}
        registerLintTarget={registerLintTarget}
        onChangeSteps={(steps) => onDraftChange({ ...draft, steps })}
        onAddStep={() =>
          onDraftChange({
            ...draft,
            steps: [...draft.steps, createStep(getNextStepId(draft.steps))]
          })
        }
      />
    </div>
  );
}
