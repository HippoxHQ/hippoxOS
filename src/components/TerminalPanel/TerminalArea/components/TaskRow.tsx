import React, { forwardRef } from "react";
import {
  getTaskStatusIcon,
  getTaskStatusText,
  formatTime,
  formatDuration,
} from "../utils";
import { TaskSteps } from "./TaskSteps";
import { TaskFiles } from "./TaskFiles";
import { TaskOutput } from "./TaskOutput";
import { TaskError } from "./TaskError";
import {
  StepStatusEnum,
  TaskInfo,
  TaskStatusEnum,
  UploadFile,
} from "../../../../types/type";
import { taskPoolCommands } from "../../../../api/TaskPool";
import { PauseIcon, PlayIcon, StopIcon } from "../../../../icons";
import { taskManager } from "../../../../TaskManager";
import { showDialog, DialogType } from "../../../Dialog";
import { showToast, ToastType } from "../../../Toast";

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
  onOpenMap?: () => void;
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
      onOpenMap,
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
          // Manually update task status to Running
          setTasks((prevTasks) =>
            prevTasks.map((t) =>
              t.task_id === taskId
                ? { ...t, status: TaskStatusEnum.Running }
                : t,
            ),
          );
          // Also refresh from taskManager
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

    const handleShowMap = () => {
      if (onOpenMap) {
        onOpenMap();
      } else {
        onOpenFunctionArea();
        window.dispatchEvent(
          new CustomEvent("open-earthos", {
            detail: { center: [116.397428, 39.90923], zoom: 10 },
          }),
        );
      }
    };

    const handleInterruptTask = async (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      showDialog(
        DialogType.WARNING,
        t("terminal.interruptConfirmTitle"),
        t("terminal.interruptConfirm"),
        async () => {
          try {
            // Immediately update UI to Cancelled
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
              // Refresh from taskManager to ensure consistency
              const newTasks = taskManager.getAllTasks();
              setTasks([...newTasks]);
            } else {
              showToast(ToastType.ERROR, t("terminal.interruptFailed"));
              // Revert on failure
              const newTasks = taskManager.getAllTasks();
              setTasks([...newTasks]);
            }
          } catch (error) {
            console.error("Failed to interrupt task:", error);
            showToast(ToastType.ERROR, t("terminal.interruptFailed"));
            // Revert on error
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
      window.dispatchEvent(
        new CustomEvent("open-chart-with-data", {
          detail: { taskId: task.task_id, taskData: task },
        }),
      );
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
        >
          <span className="task-expand-icon">{isExpanded ? "▼" : "▶"}</span>
          <span className="task-status-icon">
            {getTaskStatusIcon(task.status)}
          </span>
          <span className="task-time">[{formatTime(task.created_at)}]</span>
          <span className="task-input">{task.user_input}</span>
          <div className="task-status-right">
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
                >
                  <PauseIcon size={14} />
                </button>
                <button
                  className="task-interrupt-btn"
                  onClick={(e) => handleInterruptTask(task.task_id, e)}
                  title={t("terminal.interrupt")}
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
              >
                <PlayIcon size={14} />
              </button>
            )}
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
            <TaskOutput
              output={task.final_output}
              onCopy={handleCopyOutput}
              onShowChart={handleShowChart}
              onShowMap={handleShowMap}
              t={t}
            />
          )}

        {isExpanded &&
          task.status === TaskStatusEnum.Failed &&
          task.final_output && (
            <TaskError
              error={task.final_output}
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
