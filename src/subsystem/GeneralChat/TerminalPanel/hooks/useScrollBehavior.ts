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
  const hasInitializedRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      setAutoScroll(false);
    } else {
      userScrolledUpRef.current = false;
      setAutoScroll(true);
    }
    checkScrollPosition();
    updateActiveNavOnScroll();
  }, [checkScrollPosition, updateActiveNavOnScroll]);
  // 滚动到底部 - 只用于初始化
  const scrollToBottomOnce = useCallback(() => {
    if (!terminalRef.current) return;
    const el = terminalRef.current;
    let attempts = 0;
    const doScroll = () => {
      if (!el) return;
      el.scrollTop = el.scrollHeight;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom > 10 && attempts < 8) {
        attempts++;
        setTimeout(doScroll, 150);
      }
    };
    setTimeout(doScroll, 100);
  }, []);
  // 只在首次加载时滚动到底部
  useEffect(() => {
    if (!terminalRef.current || hasInitializedRef.current) return;
    // 延迟等待所有组件渲染
    const timer = setTimeout(() => {
      scrollToBottomOnce();
      hasInitializedRef.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, [allTasks, scrollToBottomOnce]);
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  // Scroll event listener
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
      userScrolledUpRef.current = true;
      setTimeout(() => {
        checkScrollPosition();
      }, 100);
    }
  }, [checkScrollPosition]);
  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      userScrolledUpRef.current = false;
      setAutoScroll(true);
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: "smooth",
      });
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
        userScrolledUpRef.current = true;
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