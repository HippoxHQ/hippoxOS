import { useState, useCallback, useEffect, useRef } from "react";
import { FilesScrollState } from "../types";
import { TaskInfo } from "../../../../types/type";

export const useFilesScroll = (activeTasks: TaskInfo[]) => {
  const [filesScrollStates, setFilesScrollStates] = useState<
    Map<string, FilesScrollState>
  >(new Map());
  const filesScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const checkFilesScroll = useCallback((taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
      const showLeft = scrollLeft > 0;
      const showRight = scrollLeft + clientWidth < scrollWidth - 1;
      setFilesScrollStates((prev) => {
        const newMap = new Map(prev);
        newMap.set(taskId, { showLeft, showRight });
        return newMap;
      });
    }
  }, []);

  const scrollFilesLeft = (taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      scrollElement.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollFilesRight = (taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      scrollElement.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  useEffect(() => {
    activeTasks.forEach((task) => {
      if ((task as any).files && (task as any).files.length > 0) {
        setTimeout(() => checkFilesScroll(task.task_id), 100);
      }
    });
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