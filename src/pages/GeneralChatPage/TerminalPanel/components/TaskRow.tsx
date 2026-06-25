import React, { forwardRef, useCallback, useEffect, useState } from "react";
import {
  getTaskStatusIcon,
  getTaskStatusText,
  formatTime,
  formatDuration,
} from "../utils";
import { TaskSteps } from "./TaskSteps/TaskSteps";
import { TaskFiles } from "./TaskFiles";
import { TaskOutput } from "./TaskOutput";
import { TaskError } from "./TaskError";
import { showDialog, DialogType } from "../../../../components/Dialog";
import { showToast, ToastType } from "../../../../components/Toast";
import { taskManager } from "../../../../core/TaskManager";
import { taskPoolCommands } from "../../../../core/TaskPool";
import {
  TaskInfo,
  UploadFile,
  StepStatusEnum,
  TaskStatusEnum,
} from "../../../../core/types";
import { PauseIcon, StopIcon, PlayIcon } from "../../../../icons";
import { workflowCommands } from "../../../../command/workflow";

interface TaskRowProps {
  task: TaskInfo;
  index: number;
  isExpanded: boolean;
  expandedStepParams: Set<string>;
  filesScrollState: { showLeft: boolean; showRight: boolean };
  filesScrollRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  setFilesScrollStates: React.Dispatch<
    React.SetStateAction<Map<string, { showLeft: boolean; showRight: boolean }>>
  >;
  onToggleExpand: (taskId: string) => void;
  onToggleStepParams: (stepKey: string) => void;
  onScrollFilesLeft: (taskId: string) => void;
  onScrollFilesRight: (taskId: string) => void;
  onFileClick?: (file: UploadFile) => void;
  setTasks: React.Dispatch<React.SetStateAction<TaskInfo[]>>;
  t: (key: string, params?: any) => string;
}

const workflowDisplayNameCache = new Map<string, string>();

export const TaskRow = forwardRef<HTMLDivElement, TaskRowProps>(
  (
    {
      task,
      isExpanded,
      expandedStepParams,
      filesScrollState,
      filesScrollRefs,
      setFilesScrollStates,
      onToggleExpand,
      onToggleStepParams,
      onScrollFilesLeft,
      onScrollFilesRight,
      onFileClick,
      setTasks,
      t,
    },
    ref,
  ) => {
    const [workflowDisplayName, setWorkflowDisplayName] = useState<string>("");
    const [isLoadingWorkflowName, setIsLoadingWorkflowName] = useState(true);

    const successCount = task.steps.filter(
      (s) => s.status === StepStatusEnum.Success,
    ).length;
    const failureCount = task.steps.filter(
      (s) => s.status === StepStatusEnum.Failure,
    ).length;
    const runningCount = task.steps.filter(
      (s) => s.status === StepStatusEnum.Running,
    ).length;
    const timeoutCount = task.steps.filter(
      (s) => s.status === StepStatusEnum.Timeout,
    ).length;
    let stepSummary = "";
    if (task.steps.length > 0) {
      const parts = [];
      if (successCount > 0) parts.push(`✓${successCount}`);
      if (failureCount > 0) parts.push(`✗${failureCount}`);
      if (timeoutCount > 0) parts.push(`⏱${timeoutCount}`);
      if (runningCount > 0) parts.push(`⟳${runningCount}`);
      stepSummary = ` [${parts.join(" ")}]`;
    }

    const loadWorkflowDisplayName = async () => {
      if (!task.workflow_mode) {
        setIsLoadingWorkflowName(false);
        return;
      }
      const lang = localStorage.getItem("hippox-language") || "en";
      const cacheKey = `${task.workflow_mode}_${lang}`;
      if (workflowDisplayNameCache.has(cacheKey)) {
        setWorkflowDisplayName(workflowDisplayNameCache.get(cacheKey) || "");
        setIsLoadingWorkflowName(false);
        return;
      }
      try {
        const displayName =
          await workflowCommands.workflowModeDisplayNameByLang(
            task.workflow_mode,
            lang,
          );
        workflowDisplayNameCache.set(cacheKey, displayName);
        setWorkflowDisplayName(displayName);
      } catch (error) {
        console.error("Failed to load workflow display name:", error);
        setWorkflowDisplayName(task.workflow_mode);
      } finally {
        setIsLoadingWorkflowName(false);
      }
    };

    useEffect(() => {
      loadWorkflowDisplayName();
    }, [task.workflow_mode]);

    useEffect(() => {
      const handleLanguageChange = () => {
        setIsLoadingWorkflowName(true);
        loadWorkflowDisplayName();
      };
      window.addEventListener(
        "language-changed",
        handleLanguageChange as EventListener,
      );
      return () => {
        window.removeEventListener(
          "language-changed",
          handleLanguageChange as EventListener,
        );
      };
    }, [task.workflow_mode]);

    const getRawOutput = (
      taskId: string,
      sessionId: string,
    ): string | undefined => {
      const tasksMap = (taskManager as any).tasksBySession?.get(sessionId);
      const task = tasksMap?.get(taskId);
      return task?.rawOutput || task?.final_output;
    };

    const handlePauseTask = async (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const result = await taskPoolCommands.pauseTask(taskId);
        if (result === true) {
          showToast(ToastType.SUCCESS, t("terminal.taskPaused"));
          const newTasks = taskManager.getAllTasks();
          setTasks([...newTasks]);
        } else {
          showToast(ToastType.ERROR, t("terminal.pauseFailed"));
        }
      } catch (error) {
        console.error("Failed to pause task:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        showToast(
          ToastType.ERROR,
          `${t("terminal.pauseFailed")}: ${errorMessage}`,
        );
      }
    };

    const handleResumeTask = async (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const result = await taskPoolCommands.resumeTask(taskId);
        if (result === true) {
          showToast(ToastType.SUCCESS, t("terminal.taskResumed"));
          setTasks((prevTasks) =>
            prevTasks.map((t) =>
              t.task_id === taskId
                ? { ...t, status: TaskStatusEnum.Running }
                : t,
            ),
          );
          setTimeout(async () => {
            const newTasks = taskManager.getAllTasks();
            setTasks([...newTasks]);
          }, 500);
        } else {
          showToast(ToastType.ERROR, t("terminal.resumeFailed"));
        }
      } catch (error) {
        console.error("Failed to resume task:", error);
        showToast(ToastType.ERROR, t("terminal.resumeFailed"));
      }
    };

    const handleShowMap = useCallback(
      (mapData?: any) => {
        window.dispatchEvent(
          new CustomEvent("open-map-in-panel", {
            detail: {
              mapData: mapData,
              taskId: task.task_id,
            },
          }),
        );
      },
      [task.task_id],
    );

    const handleInterruptTask = async (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      showDialog(
        DialogType.WARNING,
        t("terminal.interruptConfirmTitle"),
        t("terminal.interruptConfirm"),
        async () => {
          try {
            setTasks((prevTasks) =>
              prevTasks.map((t) =>
                t.task_id === taskId
                  ? { ...t, status: TaskStatusEnum.Cancelled }
                  : t,
              ),
            );
            const result = await taskPoolCommands.cancelTask(taskId);
            if (result) {
              showToast(ToastType.SUCCESS, t("terminal.taskInterrupted"));
              const newTasks = taskManager.getAllTasks();
              setTasks([...newTasks]);
            } else {
              showToast(ToastType.ERROR, t("terminal.interruptFailed"));
              const newTasks = taskManager.getAllTasks();
              setTasks([...newTasks]);
            }
          } catch (error) {
            console.error("Failed to interrupt task:", error);
            showToast(ToastType.ERROR, t("terminal.interruptFailed"));
            const newTasks = taskManager.getAllTasks();
            setTasks([...newTasks]);
          }
        },
        undefined,
        t("common.confirm"),
        t("common.cancel"),
      );
    };

    const handleCopyOutput = useCallback(() => {
      copyToClipboard(task.final_output, t);
    }, [task.final_output, t]);

    const handleShowChart = useCallback(() => {
      window.dispatchEvent(
        new CustomEvent("open-chart-in-panel", {
          detail: {
            chartData: task,
            taskId: task.task_id,
          },
        }),
      );
    }, [task, task.task_id]);

    const copyToClipboard = async (
      text: string | undefined,
      t: (key: string) => string,
    ) => {
      try {
        if (!text) {
          showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
          return;
        }
        await navigator.clipboard.writeText(text);
        showToast(ToastType.SUCCESS, t("common.copied") || "Copied");
      } catch (err) {
        showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
      }
    };

    const isRunningOrPending =
      task.status === TaskStatusEnum.Running ||
      task.status === TaskStatusEnum.Pending;
    const isPaused = task.status === TaskStatusEnum.Paused;

    return (
      <div key={task.task_id} ref={ref} className="task-row">
        <div
          className="task-row-header"
          onClick={() => onToggleExpand(task.task_id)}
          style={{
            display: "flex",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "4px 5px",
            padding: "4px 0px",
            cursor: "pointer",
          }}
        >
          <span
            className="task-expand-icon"
            style={{
              flexShrink: 0,
              alignSelf: "flex-start",
              paddingTop: "2px",
            }}
          >
            {isExpanded ? "▼" : "▶"}
          </span>
          <span
            className="task-status-icon"
            style={{
              flexShrink: 0,
              alignSelf: "flex-start",
            }}
          >
            {getTaskStatusIcon(task.status)}
          </span>
          {task.workflow_mode && (
            <span
              className="task-workflow-mode"
              style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "5px",
                background: "var(--accent-glow)",
                color: "var(--text-primary)",
                border: "1px solid var(--accent-color)",
                opacity: 0.8,
                flexShrink: 0,
                alignSelf: "flex-start",
                fontFamily: "monospace",
                fontWeight: 500,
                letterSpacing: "0.3px",
                // transition: "all 0.2s ease",
                marginTop: "2px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.8";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isLoadingWorkflowName
                ? "..."
                : workflowDisplayName || task.workflow_mode}
            </span>
          )}
          <span
            key={`input-${isExpanded}`}
            className="task-input"
            style={{
              flex: "1 1 0",
              whiteSpace: isExpanded ? "pre-wrap" : "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: isExpanded ? "break-word" : "normal",
              lineHeight: "1.5",
              padding: "0",
              minWidth: "0",
              alignSelf: "flex-start",
              maxHeight: isExpanded ? "7.5em" : "none",
              display: "-webkit-box",
              WebkitLineClamp: isExpanded ? 5 : "unset",
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.user_input}
          </span>

          <div
            className="task-status-right"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
              marginLeft: "auto",
              alignSelf: "flex-start",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              maxWidth: "100%",
            }}
          >
            <span
              className="task-status-text"
              style={{
                ...(task.status === TaskStatusEnum.Failed
                  ? { color: "#ff4444" }
                  : task.status === TaskStatusEnum.Paused
                    ? { color: "#ffa500" }
                    : task.status === TaskStatusEnum.Cancelled
                      ? { color: "#888888" }
                      : {}),
                whiteSpace: "nowrap",
              }}
            >
              {getTaskStatusText(t, task.status)}
              {stepSummary}
              {task.total_duration_ms !== undefined &&
                task.total_duration_ms > 0 && (
                  <span className="task-total-duration">
                    ({formatDuration(task.total_duration_ms)})
                  </span>
                )}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap",
              }}
            >
              {isRunningOrPending && (
                <>
                  <button
                    className="task-pause-btn"
                    onClick={(e) => handlePauseTask(task.task_id, e)}
                    title={t("terminal.pause")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <PauseIcon size={14} />
                  </button>
                  <button
                    className="task-interrupt-btn"
                    onClick={(e) => handleInterruptTask(task.task_id, e)}
                    title={t("terminal.interrupt")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <StopIcon size={14} />
                  </button>
                </>
              )}
              {isPaused && (
                <button
                  className="task-resume-btn"
                  onClick={(e) => handleResumeTask(task.task_id, e)}
                  title={t("terminal.resume")}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <PlayIcon size={14} />
                </button>
              )}
              <span className="task-time" style={{ whiteSpace: "nowrap" }}>
                [{formatTime(task.created_at)}]
              </span>
            </div>
          </div>
        </div>
        {isExpanded &&
          (task as any).files &&
          (task as any).files.length > 0 && (
            <TaskFiles
              files={(task as any).files}
              taskId={task.task_id}
              showLeft={filesScrollState.showLeft}
              showRight={filesScrollState.showRight}
              onScrollLeft={onScrollFilesLeft}
              onScrollRight={onScrollFilesRight}
              onFileClick={onFileClick}
              filesScrollRefs={filesScrollRefs}
              setFilesScrollStates={setFilesScrollStates}
            />
          )}

        {isExpanded && task.steps.length > 0 && (
          <TaskSteps
            steps={task.steps}
            taskId={task.task_id}
            expandedStepParams={expandedStepParams}
            onToggleStepParams={onToggleStepParams}
            t={t}
          />
        )}

        {isExpanded &&
          task.final_output &&
          task.status === TaskStatusEnum.Completed && (
            <>
              <TaskOutput
                output={
                  getRawOutput(task.task_id, task.session_id) ||
                  task.final_output
                }
                onCopy={handleCopyOutput}
                onShowChart={handleShowChart}
                onShowMap={handleShowMap}
                taskId={task.task_id}
                t={t}
                onFileClick={onFileClick}
              />
            </>
          )}

        {isExpanded &&
          task.status === TaskStatusEnum.Failed &&
          task.final_output && (
            <TaskError
              error={(task as any).rawOutput || task.final_output}
              onCopy={handleCopyOutput}
              onShowChart={handleShowChart}
              t={t}
            />
          )}

        <div className="task-separator"></div>
      </div>
    );
  },
);

TaskRow.displayName = "TaskRow";
