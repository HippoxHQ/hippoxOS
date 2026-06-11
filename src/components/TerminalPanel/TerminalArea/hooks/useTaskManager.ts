import { useState, useEffect } from "react";
import { TaskInfo } from "../../../../types/type";
import { taskManager } from "../../../../core/TaskManager";

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