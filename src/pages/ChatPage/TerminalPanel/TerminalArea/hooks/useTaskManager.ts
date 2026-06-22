import { useState, useEffect } from "react";
import { taskManager } from "../../../../../core/TaskManager";
import { TaskInfo } from "../../../../../core/types";

export const useTaskManager = (currentSessionId?: string) => {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  useEffect(() => {
    const loadInitialTasks = () => {
      const initialTasks = taskManager.getAllTasks();
      setTasks(initialTasks);
    };
    loadInitialTasks();
    const unsubscribe = taskManager.subscribe(() => {
      const newTasks = taskManager.getAllTasks();
      setTasks([...newTasks]);
    });
    return unsubscribe;
  }, []);
  const activeTasks = tasks.filter(
    (task) => !currentSessionId || task.session_id === currentSessionId,
  );
  return { tasks, setTasks, activeTasks };
};