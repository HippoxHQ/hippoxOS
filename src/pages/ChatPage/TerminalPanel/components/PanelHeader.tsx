import React from "react";
import { TaskStatusEnum } from "../../../../core/types";
import {
  TaskQueueIcon,
  ExpandArrowsIcon,
  CollapseIcon,
  ExpandAllIcon2,
  CollapseAllIcon2,
} from "../../../../icons";

interface PanelHeaderProps {
  activeTasks: any[];
  allExpanded: boolean;
  onToggleAllTasks: () => void;
  onButtonMouseEnter: () => void;
  onButtonMouseLeave: () => void;
  buttonRef: React.RefObject<HTMLDivElement | null>;
  t: (key: string) => string;
  isCollapsed?: boolean;
  togglePanel?: () => void;
  collapseIcon?: string;
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
  isCollapsed,
  togglePanel,
  collapseIcon,
}) => {
  const runningCount = activeTasks.filter(
    (t) => t.status === TaskStatusEnum.Running,
  ).length;
  return (
    <div
      className="panel-header"
      style={{
        padding: "6px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        flexShrink: 0,
        minHeight: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--text-primary)",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <TerminalIcon size={19} />
        </span>
        <span>{t("terminal.title")}</span>
        {runningCount > 0 && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-tertiary)",
              marginLeft: "4px",
            }}
          >
            ({runningCount} {t("terminal.status.running")})
          </span>
        )}
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
            width: "28px",
            height: "28px",
            borderRadius: "5px",
            background: "var(--bg-tertiary, #2d2d2d)",
            border: "1px solid var(--border-color, #444)",
            color: "var(--text-secondary, #aaa)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            // transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={onButtonMouseEnter}
          onMouseLeave={onButtonMouseLeave}
        >
          <TaskQueueIcon size={16} />
        </div>
        <button
          onClick={onToggleAllTasks}
          title={
            allExpanded ? t("terminal.collapseAll") : t("terminal.expandAll")
          }
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "5px",
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          {allExpanded ? (
            <CollapseAllIcon2 size={18} />
          ) : (
            <ExpandAllIcon2 size={18} />
          )}
        </button>
        {togglePanel && (
          <button
            onClick={togglePanel}
            title={isCollapsed ? "Expand" : "Collapse"}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "5px",
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {collapseIcon}
          </button>
        )}
      </div>
    </div>
  );
};
