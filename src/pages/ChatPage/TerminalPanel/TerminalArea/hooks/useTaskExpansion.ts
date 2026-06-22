import { useState, useEffect, useRef } from "react";
import { TaskInfo, TaskStatusEnum } from "../../../../../core/types";

export const useTaskExpansion = (allTasks: TaskInfo[], activeTasks: TaskInfo[]) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);
  const autoExpandedRef = useRef<Set<string>>(new Set());
  const allTasksRef = useRef<TaskInfo[]>(allTasks);
  const isInitializedRef = useRef(false);
  // Only run once on mount to initialize expanded state
  useEffect(() => {
    if (!isInitializedRef.current) {
      const allTaskIds = new Set(allTasks.map((task) => task.task_id));
      setExpandedTasks(allTaskIds);
      setAllExpanded(true);
      isInitializedRef.current = true;
    }
    allTasksRef.current = allTasks;
  }, [allTasks]);
  useEffect(() => {
    activeTasks.forEach((task) => {
      if (!autoExpandedRef.current.has(task.task_id)) {
        if (
          task.status === TaskStatusEnum.Failed ||
          task.status === TaskStatusEnum.Running ||
          task.status === TaskStatusEnum.Completed
        ) {
          autoExpandedRef.current.add(task.task_id);
          setExpandedTasks((prev) => new Set(prev).add(task.task_id));
        }
      }
    });
  }, [activeTasks]);
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      const allTasksExpanded = allTasksRef.current.every((task) =>
        newSet.has(task.task_id),
      );
      setAllExpanded(allTasksExpanded);
      return newSet;
    });
  };
  const toggleAllTasks = () => {
    if (allExpanded) {
      setExpandedTasks(new Set());
      setAllExpanded(false);
    } else {
      const allTaskIds = new Set(allTasksRef.current.map((task) => task.task_id));
      setExpandedTasks(allTaskIds);
      setAllExpanded(true);
    }
  };
  return {
    expandedTasks,
    allExpanded,
    toggleTaskExpand,
    toggleAllTasks,
  };
};