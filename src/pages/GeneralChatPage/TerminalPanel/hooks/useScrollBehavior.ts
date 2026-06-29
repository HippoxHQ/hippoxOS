import { useRef, useState, useCallback, useEffect } from "react";
import { TaskInfo } from "../../../../core/types";

export const useScrollBehavior = (
  allTasks: TaskInfo[],
  taskRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const userScrolledUpRef = useRef(false);
  const prevTaskCountRef = useRef(allTasks.length);
  const checkScrollPosition = useCallback(() => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    setShowScrollTop(scrollTop > 100);
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 50);
  }, []);

  const updateActiveNavOnScroll = useCallback(() => {
    if (!terminalRef.current || allTasks.length === 0) return;
    const containerRect = terminalRef.current.getBoundingClientRect();
    let closestIndex = -1;
    let minDistance = Infinity;
    allTasks.forEach((task, idx) => {
      const taskElement = taskRefs.current.get(task.task_id);
      if (taskElement) {
        const rect = taskElement.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerRect.top);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = idx;
        }
      }
    });
    setActiveNavIndex(closestIndex);
  }, [allTasks, taskRefs]);

  const handleScroll = useCallback(() => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;
    if (!isAtBottom) {
      userScrolledUpRef.current = true;
    } else {
      userScrolledUpRef.current = false;
    }
    setAutoScroll(isAtBottom);
    checkScrollPosition();
    updateActiveNavOnScroll();
  }, [checkScrollPosition, updateActiveNavOnScroll]);

  useEffect(() => {
    if (terminalRef.current && allTasks.length > prevTaskCountRef.current) {
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 50);
    }
    prevTaskCountRef.current = allTasks.length;
  }, [allTasks]);

  useEffect(() => {
    const element = terminalRef.current;
    if (element) {
      element.addEventListener("scroll", handleScroll);
      checkScrollPosition();
      return () => element.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll, checkScrollPosition]);

  useEffect(() => {
    updateActiveNavOnScroll();
  }, [allTasks, updateActiveNavOnScroll]);

  const scrollToTop = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({ top: 0, behavior: "smooth" });
      setAutoScroll(false);
      setTimeout(() => {
        checkScrollPosition();
      }, 100);
    }
  }, [checkScrollPosition]);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: "smooth",
      });
      userScrolledUpRef.current = false;
      setAutoScroll(true);
    }
  }, []);

  const scrollToTask = useCallback((index: number) => {
    const task = allTasks[index];
    if (task && taskRefs.current.has(task.task_id) && terminalRef.current) {
      const element = taskRefs.current.get(task.task_id);
      const container = terminalRef.current;
      if (element) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const offset = elementRect.top - containerRect.top - container.clientHeight / 2 + elementRect.height / 2;
        const targetScrollTop = container.scrollTop + offset;
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
        container.scrollTo({
          top: finalScrollTop,
          behavior: "smooth",
        });
        setAutoScroll(false);
        setTimeout(() => {
          checkScrollPosition();
          updateActiveNavOnScroll();
        }, 150);
      }
    }
  }, [allTasks, taskRefs, checkScrollPosition, updateActiveNavOnScroll]);

  return {
    terminalRef,
    autoScroll,
    showScrollTop,
    showScrollBottom,
    activeNavIndex,
    scrollToTop,
    scrollToBottom,
    scrollToTask,
    handleScroll,
  };
};