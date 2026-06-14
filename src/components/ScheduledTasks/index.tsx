import React, { useState, useEffect, useMemo, useRef } from "react";
import { scheduledTasksCommands } from "../../command/scheduledtasks";
import { ScheduledTask } from "./types";
import { showToast, ToastType } from "../Toast";
import { scheduledTasksStyles } from "./ScheduledTasksStyles";
import LeftStatsPanel from "./LeftStatsPanel";
import TaskCardList from "./TaskCardList";
import TaskEditPanel from "./TaskEditPanel";
import BottomHeatmapPanel from "./BottomHeatmapPanel";

const LoadingSpinnerIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="loading-spinner-svg"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

interface ScheduledTasksManagerProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
  currentSessionId?: string;
}

if (typeof document !== "undefined") {
  const styleId = "scheduled-tasks-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = scheduledTasksStyles;
    document.head.appendChild(style);
  }
}

const ScheduledTasksManager: React.FC<ScheduledTasksManagerProps> = ({
  t,
  onClose,
  currentSessionId,
}) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enabled" | "disabled" | "completed"
  >("all");
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const taskList = await scheduledTasksCommands.list();
      const sorted = [...taskList].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setTasks(sorted);
      setSelectedTask(null);
      setShowRightPanel(false);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      showToast(ToastType.ERROR, t("scheduled.loadFailed") || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter === "enabled" && (!task.enabled || task.completed))
        return false;
      if (statusFilter === "disabled" && (task.enabled || task.completed))
        return false;
      if (statusFilter === "completed" && !task.completed) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = task.name.toLowerCase().includes(query);
        const descMatch =
          task.action_type === "naturallanguage" &&
          (task as any).natural_language_content?.toLowerCase().includes(query);
        return nameMatch || descMatch;
      }
      return true;
    });
  }, [tasks, searchQuery, statusFilter]);

  const stats = {
    total: tasks.length,
    enabled: tasks.filter((t) => t.enabled && !t.completed).length,
    disabled: tasks.filter((t) => !t.enabled && !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  const getExecutionTrend = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString();
    });
    const trend = last7Days.map((date) => {
      return tasks.filter((t) => {
        if (!t.last_executed_at) return false;
        return new Date(t.last_executed_at).toLocaleDateString() === date;
      }).length;
    });
    return { labels: last7Days.map((d) => d.slice(5)), values: trend };
  };

  const handleTaskCreated = async (task: ScheduledTask) => {
    setTasks((prevTasks) => [task, ...prevTasks]);
    setSelectedTask(task);
    setShowRightPanel(true);
    showToast(ToastType.SUCCESS, t("scheduled.addSuccess") || "创建成功");
  };

  const handleTaskUpdated = async (task: ScheduledTask) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === task.id ? task : t)),
    );
    setSelectedTask(task);
    setShowRightPanel(true);
    showToast(ToastType.SUCCESS, t("scheduled.updateSuccess") || "更新成功");
  };

  const handleTaskToggled = async (taskId: string, enabled: boolean) => {
    try {
      const updatedTask = await scheduledTasksCommands.toggle(taskId, enabled);
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
      showToast(
        ToastType.SUCCESS,
        enabled
          ? t("scheduled.enabledSuccess") || "已启用"
          : t("scheduled.disabledSuccess") || "已禁用",
      );
    } catch (error) {
      console.error("Failed to toggle task:", error);
      showToast(ToastType.ERROR, t("scheduled.toggleFailed") || "操作失败");
    }
  };

  const handleTaskDeleted = async (taskId: string) => {
    try {
      await scheduledTasksCommands.delete(taskId);
      setTasks((prevTasks) => {
        const newTasks = prevTasks.filter((task) => task.id !== taskId);
        if (selectedTask?.id === taskId) {
          if (newTasks.length > 0) {
            setSelectedTask(newTasks[0]);
            setShowRightPanel(true);
          } else {
            setSelectedTask(null);
            setShowRightPanel(false);
          }
        }
        return newTasks;
      });
      showToast(ToastType.SUCCESS, t("scheduled.deleteSuccess") || "删除成功");
    } catch (error) {
      console.error("Failed to delete task:", error);
      showToast(ToastType.ERROR, t("scheduled.deleteFailed") || "删除失败");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const completedTask = await scheduledTasksCommands.complete(taskId);
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? completedTask : task)),
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask(completedTask);
      }
      showToast(
        ToastType.SUCCESS,
        t("scheduled.completeSuccess") || "任务已完成",
      );
    } catch (error) {
      console.error("Failed to complete task:", error);
      showToast(
        ToastType.ERROR,
        t("scheduled.completeFailed") || "标记完成失败",
      );
    }
  };

  const handleSelectTask = (task: ScheduledTask) => {
    setSelectedTask(task);
    setShowRightPanel(true);
  };

  const handleCreateNew = () => {
    setSelectedTask(null);
    setShowRightPanel(true);
  };

  const handleCloseRightPanel = () => {
    setShowRightPanel(false);
    setSelectedTask(null);
  };

  const handleLeftResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth >= 280 && newWidth <= 500) {
        setLeftPanelWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleRightResizeMouseDown = (e: React.MouseEvent) => {
    if (!showRightPanel) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth - (moveEvent.clientX - startX);
      if (newWidth >= 300 && newWidth <= 550) {
        setRightPanelWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  if (loading) {
    return (
      <div className="scheduled-tasks-container">
        <div className="loading-container">
          <div className="loading-spinner">
            <LoadingSpinnerIcon />
          </div>
          <span>{t("common.loading") || "加载中..."}</span>
        </div>
      </div>
    );
  }

  const executionTrend = getExecutionTrend();

  return (
    <div className="scheduled-tasks-layout">
      <div className="scheduled-tasks-main" ref={containerRef}>
        <div className="scheduled-left-panel" style={{ width: leftPanelWidth }}>
          <LeftStatsPanel
            t={t}
            stats={stats}
            executionTrend={executionTrend}
            tasks={tasks}
          />
        </div>

        <div
          className="resize-handle-scheduled"
          onMouseDown={handleLeftResizeMouseDown}
        >
          <div className="handle-line"></div>
        </div>

        <div className="scheduled-center-wrapper">
          <TaskCardList
            t={t}
            tasks={filteredTasks}
            selectedTaskId={selectedTask?.id || null}
            onSelectTask={handleSelectTask}
            onToggleTask={handleTaskToggled}
            onDeleteTask={handleTaskDeleted}
            onCompleteTask={handleCompleteTask}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onCreateNew={handleCreateNew}
          />
        </div>
        {showRightPanel && (
          <div
            className="resize-handle-scheduled"
            onMouseDown={handleRightResizeMouseDown}
          >
            <div className="handle-line"></div>
          </div>
        )}
        {showRightPanel && (
          <div
            className="scheduled-right-panel"
            style={{ width: rightPanelWidth }}
          >
            <TaskEditPanel
              t={t}
              task={selectedTask}
              isCreating={selectedTask === null}
              onTaskCreated={handleTaskCreated}
              onTaskUpdated={handleTaskUpdated}
              onTaskDeleted={handleTaskDeleted}
              onClose={handleCloseRightPanel}
            />
          </div>
        )}
      </div>
      <BottomHeatmapPanel t={t} tasks={tasks} />
    </div>
  );
};

export default ScheduledTasksManager;
