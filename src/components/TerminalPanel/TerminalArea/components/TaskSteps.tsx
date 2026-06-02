import React from "react";
import { StepParameters } from "./StepParameters";
import { TaskStepInfo } from "../../../../types/type";
import { getStepEmoji } from "../constants";
import { getStepStatusIcon, formatDuration, getStepStatusText } from "../utils";

interface TaskStepsProps {
  steps: TaskStepInfo[];
  taskId: string;
  expandedStepParams: Set<string>;
  onToggleStepParams: (stepKey: string) => void;
  t: (key: string) => string;
}

export const TaskSteps: React.FC<TaskStepsProps> = ({
  steps,
  taskId,
  expandedStepParams,
  onToggleStepParams,
  t,
}) => {
  return (
    <div className="task-steps">
      {steps.map((step) => (
        <div key={`${taskId}-step-${step.step_index}`} className="task-step">
          <div className="step-main-row">
            <span className="step-icon">{getStepStatusIcon(step.status)}</span>
            <span className="step-name">
              {getStepEmoji(step.step_name)} {step.step_name}
            </span>
            {step.duration_ms !== undefined && (
              <span className="step-duration">
                ({formatDuration(step.duration_ms)})
              </span>
            )}
            <span className="step-status-spacer"></span>
            <span
              className={`step-status step-status-${step.status.toLowerCase()}`}
            >
              {t(getStepStatusText(step.status))}
            </span>
          </div>
          {step.parameters && step.parameters !== "{}" && (
            <StepParameters
              parameters={step.parameters}
              stepKey={`${taskId}-step-${step.step_index}-params`}
              isExpanded={expandedStepParams.has(
                `${taskId}-step-${step.step_index}-params`,
              )}
              onToggle={onToggleStepParams}
              t={t}
            />
          )}
        </div>
      ))}
    </div>
  );
};
