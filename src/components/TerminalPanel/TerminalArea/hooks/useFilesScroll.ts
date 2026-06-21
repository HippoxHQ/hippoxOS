import { useState, useCallback, useEffect, useRef } from "react";
import { FilesScrollState } from "../types";
import { TaskInfo } from "../../../../core/types";

export const useFilesScroll = (activeTasks: TaskInfo[]) => {
  const [filesScrollStates, setFilesScrollStates] = useState<
    Map<string, FilesScrollState>
  >(new Map());
  const filesScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousTaskIdsRef = useRef<string[]>([]);

  const checkFilesScroll = useCallback((taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
      const showLeft = scrollLeft > 0;
      const showRight = scrollLeft + clientWidth < scrollWidth - 1;
      setFilesScrollStates((prev) => {
        const currentState = prev.get(taskId);
        if (
          currentState &&
          currentState.showLeft === showLeft &&
          currentState.showRight === showRight
        ) {
          return prev;
        }
        const newMap = new Map(prev);
        newMap.set(taskId, { showLeft, showRight });
        return newMap;
      });
    }
  }, []);

  const scrollFilesLeft = useCallback((taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      scrollElement.scrollBy({ left: -300, behavior: "smooth" });
    }
  }, []);

  const scrollFilesRight = useCallback((taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      scrollElement.scrollBy({ left: 300, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const currentTaskIds = activeTasks.map((task) => task.task_id);
    const hasChanges =
      currentTaskIds.length !== previousTaskIdsRef.current.length ||
      currentTaskIds.some((id, index) => id !== previousTaskIdsRef.current[index]);

    if (hasChanges) {
      previousTaskIdsRef.current = currentTaskIds;
      activeTasks.forEach((task) => {
        if ((task as any).files && (task as any).files.length > 0) {
          setTimeout(() => checkFilesScroll(task.task_id), 100);
        }
      });
    }
  }, [activeTasks, checkFilesScroll]);

  return {
    filesScrollStates,
    setFilesScrollStates,
    filesScrollRefs,
    checkFilesScroll,
    scrollFilesLeft,
    scrollFilesRight,
  };
};