import React, { useState, useRef, useEffect } from "react";
import { getStepEmoji } from "../../constants";
import { formatDuration, getStepStatusText } from "../../utils";
import { TaskStepInfo, StepStatusEnum } from "../../../../../core/types";
import { StepParameters } from "./StepParameters";

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
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const logContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const toggleLogs = (stepIndex: number) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      const isExpanding = !newSet.has(stepIndex);
      if (isExpanding) {
        newSet.add(stepIndex);
      } else {
        newSet.delete(stepIndex);
      }
      if (isExpanding) {
        setTimeout(() => {
          const container = logContainerRefs.current.get(stepIndex);
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 50);
      }
      return newSet;
    });
  };
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

  const getStatusColor = (status: StepStatusEnum) => {
    switch (status) {
      case StepStatusEnum.Success:
        return "#4caf50";
      case StepStatusEnum.Failure:
        return "#f44336";
      case StepStatusEnum.Running:
        return "#ffa500";
      default:
        return "#888";
    }
  };

  return (
    <div className="task-steps" style={{ paddingLeft: "8px" }}>
      {steps.map((step, index) => {
        const progress = step.progress ?? 0;
        const colors = getProgressColor(step.status);
        const logs = step.logs || [];
        const isLogExpanded = expandedLogs.has(index);
        const displayLogs = isLogExpanded ? logs : logs.slice(-1);
        const hasProgress =
          step.progress !== undefined &&
          step.progress !== null &&
          step.progress > 0;
        const isLast = index === steps.length - 1;
        const statusColor = getStatusColor(step.status);
        return (
          <div
            key={`${taskId}-step-${step.step_index}`}
            style={{
              position: "relative",
              paddingLeft: "24px",
            }}
          >
            {!isLast && (
              <div
                style={{
                  position: "absolute",
                  left: "6px",
                  top: "0",
                  bottom: "-8px",
                  width: "2px",
                  backgroundColor: "var(--border-color, #333)",
                  opacity: 0.5,
                }}
              />
            )}

            <div
              style={{
                position: "absolute",
                left: "0",
                top: "10px",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: statusColor,
                border: "2px solid var(--bg-primary, #1a1a1a)",
                boxShadow: `0 0 8px ${statusColor}40`,
                zIndex: 1,
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "6px",
                top: "4px",
                width: "25px",
                height: "14px",
                borderBottom: "2px solid var(--border-color, #333)",
                borderLeft: "2px solid var(--border-color, #333)",
                opacity: 0.5,
                zIndex: 0,
              }}
            />

            <div
              className="task-step"
              style={{ paddingBottom: isLast ? "0" : "8px" }}
            >
              <div className="step-main-row" style={{ paddingLeft: "10px" }}>
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
              {logs.length > 0 && (
                <div
                  style={{
                    paddingLeft: "10px",
                    marginTop: "6px",
                    marginBottom: "6px",
                    width: "100%",
                    paddingRight: "35%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleLogs(index)}
                  >
                    <div
                      ref={(el) => {
                        if (el && logs.length > 1) {
                          logContainerRefs.current.set(index, el);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      style={{
                        flex: 1,
                        maxHeight: isLogExpanded ? "120px" : "20px",
                        overflowY: isLogExpanded ? "auto" : "hidden",
                        fontSize: "11px",
                        fontFamily: "monospace",
                        color: "var(--text-secondary)",
                        lineHeight: "1.6",
                        transition: "max-height 0.3s ease",
                        scrollbarWidth: "thin",
                        scrollbarColor: "var(--border-color) transparent",
                      }}
                    >
                      {displayLogs.map((log, logIdx) => (
                        <div
                          key={logIdx}
                          style={{
                            padding: "1px 0",
                            borderBottom:
                              logIdx < displayLogs.length - 1
                                ? "1px solid var(--border-color, rgba(255,255,255,0.05))"
                                : "none",
                            opacity:
                              logIdx === displayLogs.length - 1 ? 1 : 0.8,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                    {logs.length > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-primary)",
                          flexShrink: 0,
                          opacity: 0.6,
                          marginTop: "1px",
                          userSelect: "none",
                        }}
                      >
                        {isLogExpanded
                          ? "▲"
                          : `▼ ${logs.length} ${t("task.logsCount")}`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {hasProgress && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: logs.length > 0 ? "2px" : "4px",
                    width: "100%",
                    paddingLeft: "10px",
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
              )}

              {step.input && step.input !== "{}" && (
                <StepParameters
                  parameters={step.input}
                  stepKey={`${taskId}-step-${step.step_index}-input-params`}
                  isExpanded={expandedStepParams.has(
                    `${taskId}-step-${step.step_index}-input-params`,
                  )}
                  onToggle={onToggleStepParams}
                  t={t}
                  type="input"
                />
              )}

              {step.output && step.output !== "{}" && (
                <StepParameters
                  parameters={step.output}
                  stepKey={`${taskId}-step-${step.step_index}-output-params`}
                  isExpanded={expandedStepParams.has(
                    `${taskId}-step-${step.step_index}-output-params`,
                  )}
                  onToggle={onToggleStepParams}
                  t={t}
                  type="output"
                />
              )}
            </div>
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
