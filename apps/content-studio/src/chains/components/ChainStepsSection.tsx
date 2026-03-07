import type { Node } from "@lxp/schema";
import type { LintIssue } from "../../lint/types";
import type { DraftStep } from "../../types";
import { ChainStepCard } from "./ChainStepCard";

type ChainStepsSectionProps = {
  chainId: string;
  steps: DraftStep[];
  nodes: Node[];
  lintFocusTarget: string;
  getLintIssuesForTarget: (key: string) => LintIssue[];
  registerLintTarget: (key: string) => (node: HTMLElement | null) => void;
  onChangeSteps: (next: DraftStep[]) => void;
  onAddStep: () => void;
};

export function ChainStepsSection({
  chainId,
  steps,
  nodes,
  lintFocusTarget,
  getLintIssuesForTarget,
  registerLintTarget,
  onChangeSteps,
  onAddStep
}: ChainStepsSectionProps) {
  return (
    <div className="form__section">
      <div className="form__section-header">
        <h3>Steps</h3>
        <button type="button" className="button button--ghost" onClick={onAddStep}>
          Add Step
        </button>
      </div>
      {steps.length === 0 ? (
        <p className="form__empty">No steps</p>
      ) : (
        <div className="step-list">
          {steps.map((step, index) => (
            <ChainStepCard
              key={step.id}
              chainId={chainId}
              step={step}
              index={index}
              nodes={nodes}
              lintFocusTarget={lintFocusTarget}
              getLintIssuesForTarget={getLintIssuesForTarget}
              registerLintTarget={registerLintTarget}
              onChange={(nextStep) =>
                onChangeSteps(steps.map((item) => (item.id === step.id ? nextStep : item)))
              }
              onRemove={() => onChangeSteps(steps.filter((item) => item.id !== step.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
