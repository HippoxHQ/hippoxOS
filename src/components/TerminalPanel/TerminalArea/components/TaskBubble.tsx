import React from "react";
import { WELCOME_TASK_ID, styles } from "../constants";
import { getTaskStatusIcon, getTaskStatusText } from "../utils";
import { TaskInfo } from "../../../../types/type";

interface TaskBubbleProps {
  allTasks: TaskInfo[];
  activeNavIndex: number;
  onScrollToTask: (index: number) => void;
  t: (key: string) => string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  style?: React.CSSProperties;
}

export const TaskBubble: React.FC<TaskBubbleProps> = ({
  allTasks,
  activeNavIndex,
  onScrollToTask,
  t,
  onMouseEnter,
  onMouseLeave,
  style,
}) => {
  return (
    <div
      style={{ ...styles.bubbleContainer, ...style }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={styles.bubbleHeader}>
        {t("terminal.taskList") || "Task List"} ({allTasks.length})
      </div>
      <div style={styles.bubbleContent}>
        {allTasks.map((task, idx) => {
          const isActive = activeNavIndex === idx;
          const preview =
            task.task_id === WELCOME_TASK_ID
              ? "🎉 " + t("terminal.welcome.title")
              : task.user_input.length > 45
                ? task.user_input.substring(0, 45) + "..."
                : task.user_input;
          return (
            <div
              key={task.task_id}
              style={{
                ...styles.bubbleItem,
                ...(isActive ? styles.bubbleItemActive : {}),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #2a2a2a)";
                e.currentTarget.style.borderLeftColor =
                  "var(--accent-color, #00aaff)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.borderLeftColor = "transparent";
                }
              }}
              onClick={() => onScrollToTask(idx)}
            >
              <span style={styles.bubbleItemIcon}>
                {getTaskStatusIcon(task.status)}
              </span>
              <span style={styles.bubbleItemText} title={preview}>
                {preview}
              </span>
              <span style={styles.bubbleItemStatus}>
                {getTaskStatusText(t, task.status)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
