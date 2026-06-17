import React, { useState } from "react";
import { StepParameters } from "./StepParameters";
import { TaskStepInfo, StepStatusEnum } from "../../../../types/type";
import { getStepEmoji } from "../constants";
import { formatDuration, getStepStatusText } from "../utils";

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
  const [progressMap] = useState<Map<number, number>>(() => {
    const map = new Map<number, number>();
    steps.forEach((step, index) => {
      map.set(index, Math.floor(Math.random() * 80) + 10);
    });
    return map;
  });

  const getProgressColor = (status: StepStatusEnum) => {
    switch (status) {
      case StepStatusEnum.Success:
        return {
          start: "#4caf50",
          end: "#81c784",
          glow: "rgba(76, 175, 80, 0.3)",
        };
      case StepStatusEnum.Failure:
        return {
          start: "#f44336",
          end: "#ef5350",
          glow: "rgba(244, 67, 54, 0.3)",
        };
      default:
        return {
          start: "#00aaff",
          end: "#66d9ff",
          glow: "rgba(0, 170, 255, 0.3)",
        };
    }
  };

  return (
    <div className="task-steps">
      {steps.map((step, index) => {
        const progress = progressMap.get(index) ?? 0;
        const colors = getProgressColor(step.status);

        return (
          <div key={`${taskId}-step-${step.step_index}`} className="task-step">
            <div className="step-main-row">
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "4px",
                width: "100%",
                paddingLeft: "20px",
              }}
            >
              <div
                style={{
                  flex: "1 1 0",
                  height: "6px",
                  backgroundColor: "var(--bg-tertiary, #2d2d2d)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  position: "relative",
                  minWidth: "0",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(progress, 0.5)}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${colors.start}, ${colors.end})`,
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                    position: "relative",
                    boxShadow: `0 0 12px ${colors.glow}`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 100%)",
                      transform: "translateX(-100%)",
                      animation: "shimmer 3s ease-in-out infinite",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  minWidth: "36px",
                  textAlign: "right",
                  color: colors.start,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Math.round(progress)}%
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
        );
      })}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};
