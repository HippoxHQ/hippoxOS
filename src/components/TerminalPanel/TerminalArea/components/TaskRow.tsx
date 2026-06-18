import React, { forwardRef } from "react";
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
import { taskPoolCommands } from "../../../../core/TaskPool";
import { PauseIcon, PlayIcon, StopIcon } from "../../../../icons";
import { showDialog, DialogType } from "../../../Dialog";
import { showToast, ToastType } from "../../../Toast";
import { FunctionInstance } from "../../FunctionArea/types";
import { taskManager } from "../../../../core/TaskManager";
import {
  TaskInfo,
  UploadFile,
  StepStatusEnum,
  TaskStatusEnum,
} from "../../../../core/types";

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
  onOpenFunctionArea: () => void;
  setTasks: React.Dispatch<React.SetStateAction<TaskInfo[]>>;
  t: (key: string, params?: any) => string;
}

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
      onOpenFunctionArea,
      setTasks,
      t,
    },
    ref,
  ) => {
    const successCount = task.steps.filter(
      (s) => s.status === StepStatusEnum.Success,
    ).length;
    const failureCount = task.steps.filter(
      (s) => s.status === StepStatusEnum.Failure,
    ).length;
    const runningCount = task.steps.filter(
      (s) => s.status === StepStatusEnum.Running,
    ).length;
    let stepSummary = "";
    if (task.steps.length > 0) {
      const parts = [];
      if (successCount > 0) parts.push(`✓${successCount}`);
      if (failureCount > 0) parts.push(`✗${failureCount}`);
      if (runningCount > 0) parts.push(`⟳${runningCount}`);
      stepSummary = ` [${parts.join(" ")}]`;
    }

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
    const handleShowMap = (mapData?: any) => {
      onOpenFunctionArea();
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("function-area-open-module", {
            detail: {
              moduleType: FunctionInstance.Earthview,
              taskId: task.task_id,
              mapData: mapData,
              center: mapData?.view?.center,
              zoom: mapData?.view?.zoom,
            },
          }),
        );
      }, 100);
    };
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

    const handleCopyOutput = () => {
      copyToClipboard(task.final_output, t);
    };

    const handleShowChart = () => {
      onOpenFunctionArea();
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("function-area-open-module", {
            detail: {
              moduleType: FunctionInstance.Canldeview,
              taskId: task.task_id,
            },
          }),
        );
        window.dispatchEvent(
          new CustomEvent("open-chart-with-data", {
            detail: { taskId: task.task_id, taskData: task },
          }),
        );
      }, 100);
    };

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
              gap: "8px",
              flexShrink: 0,
              marginLeft: "auto",
              alignSelf: "flex-start",
            }}
          >
            <span
              className="task-status-text"
              style={
                task.status === TaskStatusEnum.Failed
                  ? { color: "#ff4444" }
                  : task.status === TaskStatusEnum.Paused
                    ? { color: "#ffa500" }
                    : task.status === TaskStatusEnum.Cancelled
                      ? { color: "#888888" }
                      : {}
              }
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
                }}
              >
                <PlayIcon size={14} />
              </button>
            )}
            <span className="task-time" style={{ flexShrink: 0 }}>
              [{formatTime(task.created_at)}]
            </span>
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
