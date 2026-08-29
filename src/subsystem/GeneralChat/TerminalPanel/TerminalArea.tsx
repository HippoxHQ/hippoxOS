import React, { useEffect, useRef, useCallback, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { TerminalAreaProps } from "./types";
import { WELCOME_TASK_ID } from "./constants";
import { useTaskManager, useTaskExpansion, useFilesScroll, useBubbleMenu, useStepParams } from "./hooks";
import { PanelHeader, WelcomeMessage, TaskRow, ScrollButtons, TaskBubble } from "./components";
import { TaskStatusEnum } from "../../../core/types";
import { globalStyles } from "./styles";
import { ChevronUp, ChevronDown } from "lucide-react";
const TerminalArea: React.FC<TerminalAreaProps> = ({ logs, onClearLogs, t, currentSessionId, onFileClick, theme: _theme, i18n: _i18n, isCollapsed, togglePanel, collapseIcon }) => {
  const { tasks, setTasks, activeTasks } = useTaskManager(currentSessionId);
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { expandedStepParams, toggleStepParams } = useStepParams();
  const { filesScrollStates, setFilesScrollStates, filesScrollRefs, scrollFilesLeft, scrollFilesRight } = useFilesScroll(activeTasks);
  // State for scroll button visibility
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  // Build all tasks including welcome message
  const allTasks = [
    {
      task_id: WELCOME_TASK_ID,
      session_id: "welcome",
      user_input: "🎉 Hippox AI Runtime " + t("terminal.welcome.title"),
      status: TaskStatusEnum.Completed,
      steps: [],
      final_output: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    ...activeTasks,
  ];
  const { expandedTasks, allExpanded, toggleTaskExpand, toggleAllTasks } = useTaskExpansion(allTasks, activeTasks);
  const { showBubble, buttonRef, handleButtonMouseEnter, handleButtonMouseLeave, handleBubbleMouseEnter, handleBubbleMouseLeave } = useBubbleMenu();
  const isWelcomeExpanded = expandedTasks.has(WELCOME_TASK_ID);
  // Track scroll position to update button visibility
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target) {
      const { scrollTop, scrollHeight, clientHeight } = target;
      const atTop = scrollTop <= 10;
      const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
      setShowScrollTop(!atTop);
      setShowScrollBottom(!atBottom);
      // Update active nav index based on visible tasks
      const taskElements = target.querySelectorAll(".task-row");
      let closestIndex = -1;
      let closestDistance = Infinity;
      taskElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const containerRect = target.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerRect.top);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setActiveNavIndex(closestIndex);
    }
  }, []);
  // Scroll to top using Virtuoso
  const handleScrollToTop = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  }, []);
  // Scroll to bottom using Virtuoso
  const handleScrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: allTasks.length - 1,
      align: "end",
      behavior: "smooth",
    });
  }, [allTasks.length]);
  // Scroll to specific task using Virtuoso
  const handleScrollToTask = useCallback(
    (index: number) => {
      if (index >= 0 && index < allTasks.length) {
        virtuosoRef.current?.scrollToIndex({
          index,
          align: "center",
          behavior: "smooth",
        });
      }
    },
    [allTasks.length],
  );
  // Auto-scroll to bottom on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allTasks.length > 0) {
        virtuosoRef.current?.scrollToIndex({
          index: allTasks.length - 1,
          align: "end",
          behavior: "auto",
        });
        // Update scroll button visibility after scroll
        setTimeout(() => {
          setShowScrollTop(false);
          setShowScrollBottom(false);
        }, 100);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [allTasks.length]);
  // Handle locate task event
  useEffect(() => {
    const handleLocateTask = (event: CustomEvent) => {
      const { taskId } = event.detail;
      const taskIndex = allTasks.findIndex((t) => t.task_id === taskId);
      if (taskIndex !== -1) {
        handleScrollToTask(taskIndex);
      } else {
        console.warn(`Task not found: ${taskId}`);
      }
    };
    window.addEventListener("locate-task-in-terminal", handleLocateTask as EventListener);
    return () => {
      window.removeEventListener("locate-task-in-terminal", handleLocateTask as EventListener);
    };
  }, [allTasks, handleScrollToTask]);
  const bubblePosition = (() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return {
        right: window.innerWidth - rect.right,
        top: rect.bottom + 4,
      };
    }
    return { right: 0, top: 0 };
  })();
  // Render a single task item for Virtuoso
  const renderTaskItem = useCallback(
    (index: number, task: any) => {
      // Welcome message is at index 0
      if (task.task_id === WELCOME_TASK_ID) {
        return <WelcomeMessage key={task.task_id} isExpanded={isWelcomeExpanded} onToggle={() => toggleTaskExpand(WELCOME_TASK_ID)} t={t} />;
      }
      // Active tasks start from index 1
      const taskIndex = index - 1;
      const actualTask = activeTasks[taskIndex];
      if (!actualTask) return null;
      return (
        <TaskRow
          key={actualTask.task_id}
          ref={(el) => {
            if (el) {
              taskRefs.current.set(actualTask.task_id, el);
            }
          }}
          task={actualTask}
          index={taskIndex}
          isExpanded={expandedTasks.has(actualTask.task_id)}
          expandedStepParams={expandedStepParams}
          filesScrollState={
            filesScrollStates.get(actualTask.task_id) || {
              showLeft: false,
              showRight: false,
            }
          }
          filesScrollRefs={filesScrollRefs}
          setFilesScrollStates={setFilesScrollStates}
          onToggleExpand={toggleTaskExpand}
          onToggleStepParams={toggleStepParams}
          onScrollFilesLeft={scrollFilesLeft}
          onScrollFilesRight={scrollFilesRight}
          onFileClick={onFileClick}
          setTasks={setTasks}
          t={t}
        />
      );
    },
    [activeTasks, expandedTasks, expandedStepParams, filesScrollStates, filesScrollRefs, setFilesScrollStates, toggleTaskExpand, toggleStepParams, scrollFilesLeft, scrollFilesRight, onFileClick, setTasks, t, isWelcomeExpanded],
  );
  return (
    <div className="terminal-area-container" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <style>{globalStyles}</style>
      <PanelHeader
        activeTasks={activeTasks}
        allExpanded={allExpanded}
        onToggleAllTasks={toggleAllTasks}
        onButtonMouseEnter={handleButtonMouseEnter}
        onButtonMouseLeave={handleButtonMouseLeave}
        buttonRef={buttonRef as React.RefObject<HTMLDivElement>}
        t={t}
        isCollapsed={isCollapsed}
        togglePanel={togglePanel}
        collapseIcon={collapseIcon}
      />
      <div
        className="terminal-content-wrapper"
        style={{
          position: "relative",
          flex: 1,
          overflow: "visible",
          minHeight: 0,
        }}
      >
        <div
          className="terminal-content"
          style={{
            height: "100%",
            overflowY: "auto",
            position: "relative",
          }}
        >
          <Virtuoso ref={virtuosoRef} data={allTasks} style={{ height: "100%", width: "100%" }} itemContent={renderTaskItem} onScroll={handleScroll} />
        </div>
        {/* Scroll buttons - using same className as ChatPanel for consistent touch/hover effects */}
        {(showScrollTop || showScrollBottom) && (
          <div
            style={{
              position: "absolute",
              right: "12px",
              bottom: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              zIndex: 10,
            }}
          >
            {showScrollTop && (
              <button
                style={{
                  height: "32px",
                  width: "32px",
                  borderRadius: "500px",
                }}
                className="scroll-btn"
                onClick={handleScrollToTop}
                title={t("terminal.scrollToTop") || "Scroll to top"}
              >
                <ChevronUp size={18} />
              </button>
            )}
            {showScrollBottom && (
              <button
                style={{
                  height: "32px",
                  width: "32px",
                  borderRadius: "500px",
                }}
                className="scroll-btn"
                onClick={handleScrollToBottom}
                title={t("terminal.scrollToBottom") || "Scroll to bottom"}
              >
                <ChevronDown size={18} />
              </button>
            )}
          </div>
        )}
      </div>
      {showBubble && allTasks.length > 0 && (
        <TaskBubble
          allTasks={allTasks}
          activeNavIndex={activeNavIndex}
          onScrollToTask={handleScrollToTask}
          t={t}
          onMouseEnter={handleBubbleMouseEnter}
          onMouseLeave={handleBubbleMouseLeave}
          style={{
            position: "fixed",
            right: bubblePosition.right,
            top: bubblePosition.top,
          }}
        />
      )}
    </div>
  );
};
export default TerminalArea;
