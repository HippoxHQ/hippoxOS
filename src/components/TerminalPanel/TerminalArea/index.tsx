import React, { useEffect, useRef } from "react";
import { TerminalAreaProps } from "./types";
import { WELCOME_TASK_ID } from "./constants";
import { globalStyles } from "../styles";
import {
  useTaskManager,
  useScrollBehavior,
  useTaskExpansion,
  useFilesScroll,
  useBubbleMenu,
  useStepParams,
} from "./hooks";
import {
  PanelHeader,
  WelcomeMessage,
  TaskRow,
  ScrollButtons,
  TaskBubble,
} from "./components";
import { hippoxCommands } from "../../../command/chat";
import { TaskStatusEnum } from "../../../core/types";

const TerminalArea: React.FC<TerminalAreaProps> = ({
  logs,
  onClearLogs,
  t,
  currentSessionId,
  onFileClick,
  theme: _theme,
  i18n: _i18n,
  isCollapsed,
  togglePanel,
  collapseIcon,
}) => {
  const { tasks, setTasks, activeTasks } = useTaskManager(currentSessionId);
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { expandedStepParams, toggleStepParams } = useStepParams();
  const {
    filesScrollStates,
    setFilesScrollStates,
    filesScrollRefs,
    scrollFilesLeft,
    scrollFilesRight,
  } = useFilesScroll(activeTasks);

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

  const { expandedTasks, allExpanded, toggleTaskExpand, toggleAllTasks } =
    useTaskExpansion(allTasks, activeTasks);
  const {
    terminalRef,
    showScrollTop,
    showScrollBottom,
    activeNavIndex,
    scrollToTop,
    scrollToBottom,
    scrollToTask,
    handleScroll,
  } = useScrollBehavior(allTasks, taskRefs);

  useEffect(() => {
    const handleLocateTask = (event: CustomEvent) => {
      const { taskId } = event.detail;
      const taskIndex = allTasks.findIndex((t) => t.task_id === taskId);
      if (taskIndex !== -1) {
        scrollToTask(taskIndex);
      } else {
        console.warn(`Task not found: ${taskId}`);
      }
    };
    window.addEventListener(
      "locate-task-in-terminal",
      handleLocateTask as EventListener,
    );
    return () => {
      window.removeEventListener(
        "locate-task-in-terminal",
        handleLocateTask as EventListener,
      );
    };
  }, [allTasks, scrollToTask]);

  const {
    showBubble,
    buttonRef,
    updateBubblePosition,
    handleButtonMouseEnter,
    handleButtonMouseLeave,
    handleBubbleMouseEnter,
    handleBubbleMouseLeave,
  } = useBubbleMenu();

  const handleClearLogs = async () => {
    await hippoxCommands.clearLogs();
    onClearLogs();
  };

  const isWelcomeExpanded = expandedTasks.has(WELCOME_TASK_ID);

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

  return (
    <div
      className="terminal-area-container"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
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
          ref={terminalRef}
          onScroll={handleScroll}
          style={{
            height: "100%",
            overflowY: "auto",
          }}
        >
          <WelcomeMessage
            isExpanded={isWelcomeExpanded}
            onToggle={() => toggleTaskExpand(WELCOME_TASK_ID)}
            t={t}
          />
          {activeTasks.map((task, idx) => (
            <TaskRow
              key={task.task_id}
              ref={(el) => {
                if (el) {
                  taskRefs.current.set(task.task_id, el);
                }
              }}
              task={task}
              index={idx}
              isExpanded={expandedTasks.has(task.task_id)}
              expandedStepParams={expandedStepParams}
              filesScrollState={
                filesScrollStates.get(task.task_id) || {
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
          ))}
        </div>

        <ScrollButtons
          showScrollTop={showScrollTop}
          showScrollBottom={showScrollBottom}
          onScrollToTop={scrollToTop}
          onScrollToBottom={scrollToBottom}
        />
      </div>

      {showBubble && allTasks.length > 0 && (
        <TaskBubble
          allTasks={allTasks}
          activeNavIndex={activeNavIndex}
          onScrollToTask={scrollToTask}
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
