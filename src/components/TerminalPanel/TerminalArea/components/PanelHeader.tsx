import React from "react";
import {
  TaskQueueIcon,
  ExpandArrowsIcon,
  CollapseIcon,
} from "../../../../icons";
import { TaskStatusEnum } from "../../../../types/type";

interface PanelHeaderProps {
  activeTasks: any[];
  allExpanded: boolean;
  onToggleAllTasks: () => void;
  onButtonMouseEnter: () => void;
  onButtonMouseLeave: () => void;
  buttonRef: React.RefObject<HTMLDivElement | null>;
  t: (key: string) => string;
}

const TerminalIcon: React.FC<{ size?: number }> = ({ size = 19 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.75"
      fill="none"
    />
    <path
      d="M8 10L10 12L8 14"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M13 14H16"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  activeTasks,
  allExpanded,
  onToggleAllTasks,
  onButtonMouseEnter,
  onButtonMouseLeave,
  buttonRef,
  t,
}) => {
  const runningCount = activeTasks.filter(
    (t) => t.status === TaskStatusEnum.Running,
  ).length;

  return (
    <div
      className="panel-header"
      style={{ paddingTop: "8px", paddingBottom: "8px" }}
    >
      <div className="header-title">
        <span className="title-icon">
          <TerminalIcon size={19} />
        </span>
        <span>{t("terminal.title")}</span>
        <span className="task-count">
          {runningCount > 0 &&
            ` (${runningCount} ${t("terminal.status.running")})`}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          position: "relative",
        }}
      >
        <div
          ref={buttonRef as React.RefObject<HTMLDivElement>}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: "var(--bg-tertiary, #2d2d2d)",
            border: "1px solid var(--border-color, #444)",
            color: "var(--text-secondary, #aaa)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={onButtonMouseEnter}
          onMouseLeave={onButtonMouseLeave}
        >
          <TaskQueueIcon size={16} />
        </div>

        <button
          className="clear-logs-btn"
          onClick={onToggleAllTasks}
          title={
            allExpanded ? t("terminal.collapseAll") : t("terminal.expandAll")
          }
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            padding: "4px 8px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s",
          }}
        >
          {allExpanded ? (
            <ExpandArrowsIcon size={18} />
          ) : (
            <CollapseIcon size={18} />
          )}
        </button>
      </div>
    </div>
  );
};
