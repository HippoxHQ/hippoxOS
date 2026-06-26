import React, { useState, useRef, useEffect, useCallback } from "react";
import { useEditMessage } from "./hooks";
import {
  NormalMessage,
  StatusMessage,
  LoadingSpinner,
  MessageFileGrid,
  EditMessageForm,
  MessageActions,
} from "./components";
import { extractUrls, MessageUrlGrid } from "./components/MessageUrlGrid";
import logo from "../../../assets/logo.png";
import { LlmInstance, llmCommands } from "../../../command/llm";
import {
  WorkspaceInstance,
  workspaceCommands,
} from "../../../command/workspace";
import { workflowCommands } from "../../../command/workflow";
import FileUploader from "../../../components/FileUploader";
import { showToast, ToastType } from "../../../components/Toast";
import { taskManager } from "../../../core/TaskManager";
import { SessionDomain, UploadFile } from "../../../core/types";
import {
  ChatIcon,
  TaskQueueIcon,
  UserIcon,
  AttachmentIcon,
  FolderIcon,
  ChevronRightIcon,
  TextFileIcon,
  ImageIcon,
  VideoIcon,
  FileIcon,
  FolderOpenIcon,
} from "../../../icons";
import { isStructuredLLMResponse, parseLLMResponse } from "../../../llm/utils";
import {
  zhDefaultPrompts,
  enDefaultPrompts,
} from "../../../types/DefaultPrompt";
import { ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { chartSessionCommands } from "../../../command/session/chart";
import { useChartSession } from "../../../App/hooks/session/useChartChatSession";

interface ChartChatPanelProps {
  onSendMessage: (
    message: string,
    sessionId: string,
    files?: UploadFile[],
    workflowMode?: string,
  ) => void | Promise<void>;
  onFileClick?: (file: UploadFile) => void;
  t: (key: string, params?: any) => string;
  language?: string;
  currentSessionId?: string;
  onDragOverInputChange?: (isDragging: boolean) => void;
  navigationContent?: React.ReactNode;
  isLeftPanel?: boolean;
  onWorkflowModeChange?: (mode: string) => void;
  isCollapsed?: boolean;
  togglePanel?: () => void;
  collapseIcon?: string;
  onCloseSkillsManager?: () => void;
}

const ChartChatPanel: React.FC<ChartChatPanelProps> = ({
  onSendMessage: onSendMessageProp,
  onFileClick,
  t,
  language = "zh",
  onDragOverInputChange,
  navigationContent,
  isLeftPanel = true,
  onWorkflowModeChange,
  isCollapsed = false,
  togglePanel,
  collapseIcon: collapseIconProp,
  onCloseSkillsManager,
  currentSessionId,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showDirectoryMenu, setShowDirectoryMenu] = useState(false);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceInstance[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [workflowModes, setWorkflowModes] = useState<string[]>([]);
  const [selectedWorkflowMode, setSelectedWorkflowMode] =
    useState<string>("ReAct");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [currentModel, setCurrentModel] = useState<LlmInstance | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [suggestionPrompts, setSuggestionPrompts] = useState<string[]>([]);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [showNavBubble, setShowNavBubble] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentBtnRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const directoryBtnRef = useRef<HTMLDivElement>(null);
  const directoryMenuRef = useRef<HTMLDivElement>(null);
  const workflowBtnRef = useRef<HTMLDivElement>(null);
  const workflowMenuRef = useRef<HTMLDivElement>(null);
  const navButtonRef = useRef<HTMLDivElement>(null);
  const navBubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [workflowDisplayNames, setWorkflowDisplayNames] = useState<
    Map<string, string>
  >(new Map());
  const [showTopScrollButton, setShowTopScrollButton] = useState(false);
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  const hasLoadedTitleRef = useRef<Record<string, boolean>>({});
  const collapseIcon =
    collapseIconProp ||
    (isLeftPanel ? (isCollapsed ? "≫" : "≪") : isCollapsed ? "≪" : "≫");

  const welcomeMsg: ChatMessage = {
    id: "welcome",
    role: RoleEnum.LLM,
    content:
      language === "zh"
        ? "嗨～ 我是 Hippox 金融分析引擎！📊 我可以帮你画K线、分析趋势、分析数据，有什么想看的图表尽管说～"
        : "Hi～ I'm Hippox Financial Analysis Engine! 📊 I can help you draw candlesticks, analyze trends, and analyze data. Just tell me what charts you want to see～",
    timestamp: new Date().toISOString(),
  };

  useEffect(() => {
    const unsubscribe = taskManager.subscribe(() => {
      setUpdateTrigger((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  const getMessages = useCallback((): ChatMessage[] => {
    if (!currentSessionId) return [welcomeMsg];
    const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Chart);
    const assistantMessages =
      taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Chart);
    const allMessages = [...userMessages, ...assistantMessages].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    if (allMessages.length === 0) {
      return [welcomeMsg];
    }
    return allMessages;
  }, [currentSessionId, updateTrigger]);

  const messages = getMessages();

  const loadSessionTitle = async (sessionId: string) => {
    if (
      !sessionId ||
      sessionId.startsWith("pending_") ||
      sessionId.startsWith("temp_")
    ) {
      setSessionTitle("");
      return;
    }
    if (hasLoadedTitleRef.current[sessionId]) {
      return;
    }
    setIsLoadingTitle(true);
    try {
      const list = await chartSessionCommands.listChartSessions();
      const session = list.find((s: any) => s.session_id === sessionId);
      if (session && session.title) {
        setSessionTitle(session.title);
        hasLoadedTitleRef.current[sessionId] = true;
      } else {
        setSessionTitle(t("chat.title"));
      }
    } catch (error) {
      console.error("Failed to load session title:", error);
      setSessionTitle(t("chat.title"));
    } finally {
      setIsLoadingTitle(false);
    }
  };

  useEffect(() => {
    if (currentSessionId) {
      loadSessionTitle(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    const handleSessionTitleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { sessionId, title } = customEvent.detail;
      if (sessionId === currentSessionId && title) {
        setSessionTitle(title);
        localStorage.setItem(`session_title_${sessionId}`, title);
      }
    };
    window.addEventListener(
      "session-title-updated",
      handleSessionTitleUpdated as EventListener,
    );
    return () => {
      window.removeEventListener(
        "session-title-updated",
        handleSessionTitleUpdated as EventListener,
      );
    };
  }, [currentSessionId]);

  const {
    editingMessageId,
    editContent,
    setEditContent,
    handleEditMessage,
    handleSaveEdit,
    handleCancelEdit,
  } = useEditMessage({ currentSessionId, onSendMessage: onSendMessageProp, t });

  const loadWorkflowDisplayNames = async () => {
    try {
      const lang = localStorage.getItem("hippox-language") || "en";
      const modes = await workflowCommands.getWorkflowModeNames();
      const displayNames = new Map<string, string>();
      for (const mode of modes) {
        const displayName =
          await workflowCommands.workflowModeDisplayNameByLang(mode, lang);
        displayNames.set(mode, displayName);
      }
      setWorkflowDisplayNames(displayNames);
    } catch (error) {
      console.error("Failed to load workflow display names:", error);
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (msgDate.getTime() === today.getTime()) {
      return `${language === "zh" ? "今天" : "Today"} ${timeStr}`;
    } else if (msgDate.getTime() === yesterday.getTime()) {
      return `${language === "zh" ? "昨天" : "Yesterday"} ${timeStr}`;
    } else {
      return `${date.toLocaleDateString()} ${timeStr}`;
    }
  };

  const handleScrollUpdate = () => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const messageElements = container.querySelectorAll(".message-wrapper");
    let closestIndex = -1;
    let closestDistance = Infinity;
    messageElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerRect.top);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveNavIndex(closestIndex);
  };

  const handleNavButtonMouseEnter = () => {
    if (navBubbleTimerRef.current) {
      clearTimeout(navBubbleTimerRef.current);
      navBubbleTimerRef.current = null;
    }
    setShowNavBubble(true);
  };

  const handleNavButtonMouseLeave = () => {
    navBubbleTimerRef.current = setTimeout(() => {
      setShowNavBubble(false);
    }, 200);
  };

  const handleNavBubbleMouseEnter = () => {
    if (navBubbleTimerRef.current) {
      clearTimeout(navBubbleTimerRef.current);
      navBubbleTimerRef.current = null;
    }
    setShowNavBubble(true);
  };

  const handleNavBubbleMouseLeave = () => {
    navBubbleTimerRef.current = setTimeout(() => {
      setShowNavBubble(false);
    }, 200);
  };

  const handleResendMessage = (msg: ChatMessage) => {
    if (isResending || isSending) return;
    const sessionId = currentSessionId || "";
    if (!sessionId) {
      showToast(ToastType.SUCCESS, "Session ID cannot be empty.");
      return;
    }
    setIsResending(true);
    const message = msg.content || "";
    const currentFiles = msg.files || [];
    Promise.resolve(
      onSendMessageProp?.(message, sessionId, currentFiles),
    ).finally(() => {
      setTimeout(() => setIsResending(false), 300);
    });
  };

  const getRandomPrompts = (count: number = 6): string[] => {
    const prompts = language === "zh" ? zhDefaultPrompts : enDefaultPrompts;
    const shuffled = [...prompts];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  };

  const shouldShowSuggestions = (msgs: ChatMessage[]) => {
    if (msgs.length === 0) return false;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role !== RoleEnum.LLM) return false;
    const excludeStatuses = [MessageStatus.Pending, MessageStatus.Paused];
    if (lastMsg.status && excludeStatuses.includes(lastMsg.status)) {
      return false;
    }
    return true;
  };

  const prevMessageCountRef = useRef(0);
  const suggestionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoadRef = useRef(true);
  useEffect(() => {
    if (suggestionTimerRef.current) {
      clearInterval(suggestionTimerRef.current);
      suggestionTimerRef.current = null;
    }
    if (shouldShowSuggestions(messages)) {
      const currentLength = messages.length;
      const hasNewMessage = currentLength !== prevMessageCountRef.current;
      if (hasNewMessage || isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        prevMessageCountRef.current = currentLength;
        setSuggestionPrompts(getRandomPrompts(6));
      }
      suggestionTimerRef.current = setInterval(() => {
        setSuggestionPrompts(getRandomPrompts(6));
      }, 10000);
    } else {
      prevMessageCountRef.current = 0;
      isFirstLoadRef.current = true;
      // setSuggestionPrompts([]);
    }
    return () => {
      if (suggestionTimerRef.current) {
        clearInterval(suggestionTimerRef.current);
        suggestionTimerRef.current = null;
      }
    };
  }, [messages, language]);

  const handleSuggestionClick = (prompt: string) => {
    const sessionId = currentSessionId || "";
    if (!sessionId) {
      showToast(ToastType.SUCCESS, "Session ID cannot be empty.");
      return;
    }
    onSendMessageProp?.(prompt, sessionId, undefined, selectedWorkflowMode);
  };

  const handleContainerClick = () => textareaRef.current?.focus();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const copyToClipboard = async (text: string | undefined) => {
    try {
      if (!text) {
        showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast(ToastType.SUCCESS, t("common.copied") || "Copied");
    } catch (err) {
      showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
    }
  };

  const loadCurrentDefaultModel = async () => {
    try {
      setLoadingModel(true);
      const defaultId = await llmCommands.getDefaultLlmInstanceId();
      if (defaultId) {
        const instances = await llmCommands.getLlmInstances();
        const instancesList = Object.values(instances) as LlmInstance[];
        const defaultModel = instancesList.find(
          (inst) => inst.id === defaultId,
        );
        setCurrentModel(defaultModel || null);
      } else {
        setCurrentModel(null);
      }
    } catch (error) {
      console.error("Failed to load default model:", error);
      setCurrentModel(null);
    } finally {
      setLoadingModel(false);
    }
  };

  const loadWorkflowModes = async () => {
    try {
      const modes = await workflowCommands.getWorkflowModeNames();
      setWorkflowModes(modes);
      if (modes.length > 0 && !selectedWorkflowMode) {
        setSelectedWorkflowMode(modes[0]);
      }
    } catch (error) {
      console.error("Failed to load workflow modes:", error);
    }
  };

  const loadSessionWorkflowMode = async (sessionId: string) => {
    if (
      !sessionId ||
      sessionId.startsWith("pending_") ||
      sessionId.startsWith("temp_")
    ) {
      return;
    }
    try {
      const cached = localStorage.getItem(`workflow_mode_${sessionId}`);
      if (cached) {
        setSelectedWorkflowMode(cached);
        return;
      }
      const config =
        await chartSessionCommands.loadChartSessionConfig(sessionId);
      if (config && config.workflow_mode) {
        setSelectedWorkflowMode(config.workflow_mode);
        localStorage.setItem(
          `workflow_mode_${sessionId}`,
          config.workflow_mode,
        );
      } else {
        const defaultMode = "ReAct";
        setSelectedWorkflowMode(defaultMode);
        await chartSessionCommands.updateChartSessionConfig(sessionId, {
          workflow_mode: defaultMode,
        });
        localStorage.setItem(`workflow_mode_${sessionId}`, defaultMode);
      }
    } catch (error) {
      console.error("Failed to load session workflow mode:", error);
    }
  };

  const loadWorkspaces = async (retryCount: number = 0): Promise<void> => {
    try {
      const config = await workspaceCommands.getWorkspaceConfig();
      if (config.instances.length === 0 && retryCount < 5) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return loadWorkspaces(retryCount + 1);
      }
      setWorkspaces(config.instances);
      if (config.default_instance_id) {
        setSelectedWorkspaceId(config.default_instance_id);
      } else if (config.instances.length > 0) {
        setSelectedWorkspaceId(config.instances[0].id);
      }
    } catch (error) {
      showToast(ToastType.ERROR, "Failed to load workspaces: " + error);
    }
  };

  useEffect(() => {
    if (
      currentSessionId &&
      !currentSessionId.startsWith("pending_") &&
      !currentSessionId.startsWith("temp_")
    ) {
      loadSessionWorkflowMode(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    const handleSessionCreated = () => {
      if (currentSessionId) {
        hasLoadedTitleRef.current = {};
        loadSessionTitle(currentSessionId);
      }
    };
    window.addEventListener("chart-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("chart-session-created", handleSessionCreated);
    };
  }, [currentSessionId]);

  const checkScrollPosition = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setIsAtBottom(atBottom);
    setShowScrollButton(scrollHeight > clientHeight && !atBottom);
    setShowTopScrollButton(scrollTop > 50);
    if (atBottom) setUserScrolled(false);
    handleScrollUpdate();
  };

  const handleUserScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
      if (!atBottom) setUserScrolled(true);
    }
    checkScrollPosition();
  };

  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      setUserScrolled(false);
    }
  };

  const scrollToMessage = (index: number) => {
    if (!messagesContainerRef.current) return;
    const messageElements =
      messagesContainerRef.current.querySelectorAll(".message-wrapper");
    if (index >= 0 && index < messageElements.length) {
      messageElements[index].scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      setActiveNavIndex(index);
    }
  };

  const handleFilesAdd = (files: UploadFile[]) => {
    setUploadedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const newUniqueFiles = files.filter(
        (f) => !existingKeys.has(`${f.name}_${f.size}`),
      );
      return [...prev, ...newUniqueFiles];
    });
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSend = () => {
    if (isSending) return;
    if (inputValue.trim() || uploadedFiles.length > 0) {
      const sessionId = currentSessionId || "";
      const message = inputValue.trim() || "";
      const currentFiles = [...uploadedFiles];
      setInputValue("");
      setUploadedFiles([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsSending(true);
      Promise.resolve(
        onSendMessageProp?.(
          message,
          sessionId,
          currentFiles,
          selectedWorkflowMode,
        ),
      ).finally(() => {
        setTimeout(() => setIsSending(false), 100);
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
  };

  const handleAttachment = () => setShowAttachmentMenu(false);

  const getSelectedWorkspaceName = (): string => {
    const workspace = workspaces.find((w) => w.id === selectedWorkspaceId);
    if (!workspace) return language === "zh" ? "工作目录" : "Workspace";
    const path = workspace.workspace_path;
    const normalizedPath = path.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    return parts[parts.length - 1] || workspace.name;
  };

  const handleSelectWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;
    try {
      await workspaceCommands.setDefaultWorkspace(workspaceId);
      setSelectedWorkspaceId(workspaceId);
      setShowDirectoryMenu(false);
      await loadWorkspaces();
    } catch (error) {
      showToast(ToastType.ERROR, "Failed to set default workspace: " + error);
    }
  };

  const handleWorkflowModeChange = async (mode: string) => {
    setSelectedWorkflowMode(mode);
    setShowWorkflowMenu(false);
    if (onWorkflowModeChange) {
      onWorkflowModeChange(mode);
    }
    if (
      currentSessionId &&
      !currentSessionId.startsWith("pending_") &&
      !currentSessionId.startsWith("temp_")
    ) {
      try {
        await chartSessionCommands.updateChartSessionConfig(currentSessionId, {
          workflow_mode: mode,
        });
        localStorage.setItem(`workflow_mode_${currentSessionId}`, mode);
      } catch (error) {
        console.error("Failed to save workflow mode:", error);
        showToast(ToastType.ERROR, "Failed to save workflow mode");
      }
    } else {
      const key = currentSessionId || "pending";
      localStorage.setItem(`workflow_mode_${key}`, mode);
    }
  };

  const buildNavigationContent = (): React.ReactNode => {
    const userMessages = messages.filter((m) => m.role === RoleEnum.User);
    if (userMessages.length === 0) {
      return (
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            textAlign: "center",
            padding: "8px 4px",
            writingMode: "vertical-rl",
            letterSpacing: "1px",
            opacity: 0.5,
          }}
        >
          {t("chat.noMessages") || "No Messages"}
        </div>
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          width: "100%",
          padding: "0 4px",
        }}
      >
        {userMessages.map((msg, idx) => {
          const isActive = idx === activeNavIndex;
          const preview = msg.content?.slice(0, 8) || "...";
          return (
            <button
              key={msg.id}
              onClick={() => scrollToMessage(idx)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: isActive
                  ? "1px solid var(--accent-color)"
                  : "1px solid var(--border-color)",
                background: isActive
                  ? "var(--accent-glow)"
                  : "var(--bg-tertiary)",
                color: isActive
                  ? "var(--accent-color)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontWeight: isActive ? 600 : 400,
              }}
              title={msg.content || t("chat.emptyMessage")}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }
              }}
            >
              {preview}
            </button>
          );
        })}
      </div>
    );
  };

  const handleLocateTask = (msg: ChatMessage) => {
    if (!currentSessionId) {
      showToast(ToastType.INFO, t("chat.noRelatedTask") || "No Related Task");
      return;
    }
    const tasks = taskManager.getTasksBySession(
      currentSessionId,
      SessionDomain.Chart,
    );
    if (!tasks) {
      showToast(ToastType.INFO, t("chat.noRelatedTask") || "No Related Task");
      return;
    }
    const relatedTask = Array.from(tasks.values()).find(
      (task) =>
        task.user_input === msg.content ||
        task.final_output === msg.content ||
        task.task_id === (msg as any).relatedTaskId,
    );
    if (relatedTask) {
      window.dispatchEvent(
        new CustomEvent("locate-task-in-terminal", {
          detail: { taskId: relatedTask.task_id },
        }),
      );
    } else {
      showToast(ToastType.INFO, t("chat.noRelatedTask") || "No Related Task");
    }
  };

  useEffect(() => {
    const handleLocateTaskInChat = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { taskId } = customEvent.detail;
      if (!taskId) return;
      if (!currentSessionId) {
        showToast(ToastType.INFO, t("chat.noRelatedTask") || "No Related Task");
        return;
      }
      const tasks = taskManager.getTasksBySession(
        currentSessionId,
        SessionDomain.Chart,
      );
      if (!tasks) return;
      const task = Array.from(tasks.values()).find((t) => t.task_id === taskId);
      if (!task) {
        showToast(ToastType.INFO, t("chat.noRelatedTask") || "No Related Task");
        return;
      }
      const currentMessages = messagesRef.current;
      let targetIndex = -1;
      for (let i = 0; i < currentMessages.length; i++) {
        const msg = currentMessages[i];
        if (msg.role === RoleEnum.User) {
          let contentMatch = false;
          if (msg.content && task.user_input) {
            contentMatch =
              msg.content === task.user_input ||
              msg.content.includes(task.user_input) ||
              task.user_input.includes(msg.content);
          }
          let filesMatch = false;
          if (msg.files && msg.files.length > 0 && (task as any).files) {
            const taskFiles = (task as any).files || [];
            filesMatch = msg.files.some((f: any) =>
              taskFiles.some(
                (tf: any) => f.name === tf.name || f.path === tf.path,
              ),
            );
          }
          if (contentMatch || filesMatch) {
            targetIndex = i;
            break;
          }
        }
      }
      if (targetIndex !== -1) {
        scrollToMessage(targetIndex);
      }
    };
    window.addEventListener("locate-task-in-chat", handleLocateTaskInChat);
    return () => {
      window.removeEventListener("locate-task-in-chat", handleLocateTaskInChat);
    };
  }, [t, currentSessionId]);

  useEffect(() => {
    const handleLanguageChange = () => {
      loadWorkflowDisplayNames();
    };
    window.addEventListener(
      "language-changed",
      handleLanguageChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "language-changed",
        handleLanguageChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    loadCurrentDefaultModel();
    loadWorkspaces();
    loadWorkflowModes();
    loadWorkflowDisplayNames();
  }, []);

  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const handleLocateTaskInChat = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { taskId } = customEvent.detail;
      if (!taskId) return;
      const task = taskManager.getAllTasks().find((t) => t.task_id === taskId);
      if (!task) {
        showToast(ToastType.INFO, t("chat.noRelatedTask") || "No Related Task");
        return;
      }
      const currentMessages = messagesRef.current;
      let targetIndex = -1;
      for (let i = 0; i < currentMessages.length; i++) {
        const msg = currentMessages[i];
        if (msg.role === RoleEnum.User) {
          let contentMatch = false;
          if (msg.content && task.user_input) {
            contentMatch =
              msg.content === task.user_input ||
              msg.content.includes(task.user_input) ||
              task.user_input.includes(msg.content);
          }
          let filesMatch = false;
          if (msg.files && msg.files.length > 0 && (task as any).files) {
            const taskFiles = (task as any).files || [];
            filesMatch = msg.files.some((f: any) =>
              taskFiles.some(
                (tf: any) => f.name === tf.name || f.path === tf.path,
              ),
            );
          }
          if (contentMatch || filesMatch) {
            targetIndex = i;
            break;
          }
        }
      }
      if (targetIndex !== -1) {
        scrollToMessage(targetIndex);
      }
    };
    window.addEventListener("locate-task-in-chat", handleLocateTaskInChat);
    return () => {
      window.removeEventListener("locate-task-in-chat", handleLocateTaskInChat);
    };
  }, [t]);

  useEffect(() => {
    if (messagesContainerRef.current && !userScrolled) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
    setTimeout(handleScrollUpdate, 100);
  }, [messages, userScrolled]);

  useEffect(() => {
    const element = messagesContainerRef.current;
    if (element) {
      element.addEventListener("scroll", checkScrollPosition);
      checkScrollPosition();
      return () => element.removeEventListener("scroll", checkScrollPosition);
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(event.target as Node) &&
        attachmentBtnRef.current &&
        !attachmentBtnRef.current.contains(event.target as Node)
      ) {
        setShowAttachmentMenu(false);
      }
      if (
        directoryMenuRef.current &&
        !directoryMenuRef.current.contains(event.target as Node) &&
        directoryBtnRef.current &&
        !directoryBtnRef.current.contains(event.target as Node)
      ) {
        setShowDirectoryMenu(false);
      }
      if (
        workflowMenuRef.current &&
        !workflowMenuRef.current.contains(event.target as Node) &&
        workflowBtnRef.current &&
        !workflowBtnRef.current.contains(event.target as Node)
      ) {
        setShowWorkflowMenu(false);
      }
      if (
        navButtonRef.current &&
        !navButtonRef.current.contains(event.target as Node) &&
        !document
          .querySelector(".chat-nav-bubble")
          ?.contains(event.target as Node)
      ) {
        setShowNavBubble(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getEndingMessage = () => {
    return (
      t("chat.endingMessage") ||
      (language === "zh"
        ? "✨ 我还能为你做些什么吗？ ✨"
        : "✨ What else can I do for you? ✨")
    );
  };

  const navigation = buildNavigationContent();

  const navBubblePosition = (() => {
    if (navButtonRef.current) {
      const rect = navButtonRef.current.getBoundingClientRect();
      return {
        right: window.innerWidth - rect.right,
        top: rect.bottom + 4,
      };
    }
    return { right: 0, top: 0 };
  })();

  return (
    <div
      className="codeeditor-chat-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <style>{`
  .suggestions-title {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
  }
  .loading-text {
    opacity: 0.7;
  }
  .no-model {
    opacity: 0.7;
    font-weight: normal;
  }
  .codeeditor-chat-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
    overflow: hidden;
    width: 100%;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    flex-shrink: 0;
    min-height: 40px;
  }
   .header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
}
  .title-icon {
    font-size: 14px;
    display: inline-flex;
    align-items: center;
  }
  .header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-width: 0;
  max-width: 60%; 
}
 .header-subtitle {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 12px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;  
  flex-shrink: 1;
  min-width: 0;
  line-height: 1.5;
}
  .collapse-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 15px;
    padding: 4px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .collapse-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  .nav-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--bg-tertiary, #2d2d2d);
    border: 1px solid var(--border-color, #444);
    color: var(--text-secondary, #aaa);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .nav-btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent-color);
    color: var(--text-primary);
  }
  .chat-nav-bubble {
    position: fixed;
    min-width: 280px;
    max-width: 340px;
    max-height: 500px;
    background: var(--bg-secondary, #1e1e1e);
    border: 1px solid var(--border-color, #333);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    overflow: hidden;
    z-index: 100;
    pointer-events: auto;
  }
  .chat-nav-bubble-header {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-color, #333);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #aaa);
    background: var(--bg-tertiary, #252525);
  }
  .chat-nav-bubble-content {
    max-height: 340px;
    overflow-y: auto;
    padding: 8px 0;
  }
  .chat-nav-bubble-item {
    padding: 8px 12px;
    font-size: 12px;
    cursor: pointer;
    border-left: 2px solid transparent;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .chat-nav-bubble-item:hover {
    background: var(--hover-bg, #2a2a2a);
    border-left-color: var(--accent-color, #00aaff);
  }
  .chat-nav-bubble-item-active {
    background: var(--hover-bg, #2a2a2a);
    border-left-color: var(--accent-color, #00aaff);
  }
  .chat-nav-bubble-item-icon {
    font-size: 14px;
    flex-shrink: 0;
  }
  .chat-nav-bubble-item-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary, #fff);
  }
  .chat-nav-bubble-item-status {
    font-size: 10px;
    color: var(--text-tertiary, #888);
    flex-shrink: 0;
  }
  .chat-messages-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: var(--bg-primary);
  }
  .chat-messages {
    height: 100%;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .message-wrapper {
  display: flex;
  gap: 8px;
  animation: fadeIn 0.3s ease;
  min-width: 0;
  max-width: 100%;
}
.message-wrapper.user {
  flex-direction: row-reverse;
  min-width: 0;
  max-width: 100%;
}
  .message-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
  }
  .message-content-area {
  display: flex;
  flex-direction: column;
  max-width: 80%;
  min-width: 0;
  overflow: hidden;
  flex: 1;
}
.message-wrapper.user .message-content-area {
  align-items: flex-end;
  max-width: 80%;
  min-width: 0;
  overflow: hidden;
  flex: 1;
}
.message-bubble {
  padding: 10px 15px;
  border-radius: 5px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  max-width: 100%;
  overflow: hidden;
  word-break: break-word;
}
.message-wrapper.user .message-bubble {
  background: var(--accent-color);
  color: white;
  max-width: 100%;
  overflow: hidden;
  word-break: break-word;
}
.message-content {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}
  .message-time {
    font-size: 10px;
    color: var(--text-tertiary);
    margin-top: 4px;
  }
  .message-wrapper.user .message-time {
    color: rgba(255, 255, 255, 0.7);
  }
  .message-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 4px;
  }
  .message-files-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 8px;
    max-width: 300px;
  }
  .message-file-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
  }
  .message-file-item:hover {
    background: var(--hover-bg);
    border-color: var(--accent-color);
    transform: translateY(-1px);
  }
  .file-preview-img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
  }
  .file-icon-placeholder {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    background: var(--bg-secondary);
    border-radius: 4px;
  }
  .message-file-item .file-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  .message-file-item .file-name {
    font-size: 10px;
    color: var(--text-primary);
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .message-file-item .file-size {
    font-size: 9px;
    color: var(--text-tertiary);
  }
  .message-wrapper.user .message-files-grid {
    justify-self: flex-end;
    direction: rtl;
  }
  .message-wrapper.user .message-file-item {
    direction: ltr;
  }
  .chat-input-section {
    flex-shrink: 0;
  }
  .chat-input-container {
    margin: 8px 10px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    cursor: text;
  }
  .chat-input-container.focused {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }
  .file-uploader-container {
  }
  .input-textarea-wrapper {
    padding: 8px 12px 4px 12px;
  }
  .chat-textarea-hermes {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    outline: none;
    font-family: inherit;
    max-height: 100px;
    min-height: 22px;
  }
  .chat-textarea-hermes::placeholder {
    color: var(--text-tertiary);
  }
   .action-buttons-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 8px 6px 8px;
  gap: 4px;
  flex-wrap: wrap;
  min-width: 0;
}
.left-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
}
  .icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 12px;
  flex-shrink: 0;
  white-space: nowrap;
}
  .icon-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  .folder-btn {
    display: flex;
    align-items: center;
    gap: 4px;
  }
   .folder-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
  .chevron {
  }
  .send-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
  .send-icon-btn.active {
    background: var(--accent-color);
    color: white;
  }
  .send-icon-btn.active:hover {
    transform: scale(1.05);
    background: var(--accent-hover);
  }
  .send-icon-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .attachment-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    padding: 4px 0;
    min-width: 120px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }
  .attachment-item {
    padding: 6px 12px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 12px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .attachment-item:hover {
    background: var(--hover-bg);
  }
  .directory-menu {
    position: absolute;
    bottom: 100%;
    left: 168px;
    margin-bottom: 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    padding: 4px 0;
    min-width: 160px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }
  .directory-menu::-webkit-scrollbar {
    width: 4px;
  }
  .directory-menu::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
    border-radius: 2px;
  }
  .directory-menu::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }
  .directory-menu::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
  }
  .directory-item {
    padding: 8px 12px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .directory-item:hover {
    background: var(--hover-bg);
  }
  [data-theme="light"] .directory-item:hover {
    background: rgba(0, 0, 0, 0.12);
  }
  .directory-item.selected {
    background: var(--accent-color);
    color: white;
  }
  .directory-item.selected:hover {
    background: var(--accent-color);
  }
  .workspace-path {
    font-size: 10px;
    color: var(--text-tertiary);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }
  .selected .workspace-path {
    color: rgba(255, 255, 255, 0.7);
  }
  .directory-item-content {
    flex: 1;
    min-width: 0;
  }
  .scroll-buttons {
    position: absolute;
    bottom: 20px;
    right: 20px;
  }
  .scroll-btn {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    font-size: 14px;
  }
  .scroll-btn:hover {
    background: var(--bg-tertiary);
    transform: translateY(-2px);
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .loading-message {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .loading-spinner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .loading-gif {
    display: inline-block;
    vertical-align: middle;
  }
  .suggestions-wrapper {
    width: 100%;
  }
  .ending-message {
    text-align: center;
    padding: 5px;
    margin: 8px 0 4px 0;
    font-size: 13px;
    color: var(--text-secondary);
    background: var(--bg-tertiary);
    border-radius: 20px;
    opacity: 0.9;
    margin-bottom: 5px;
  }
  .suggestions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  padding: 4px 0;
  max-width: 100%;
  min-width: 0;
}
.suggestion-bubble {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}
.suggestion-bubble:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
  transform: translateY(-1px);
}
`}</style>

      <div
        className="panel-header"
        style={{ paddingTop: "6px", paddingBottom: "6px" }}
      >
        <div className="header-title">
          <span className="title-icon">
            <ChatIcon size={14} />
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
            title={sessionTitle || t("chat.title")}
          >
            {isLoadingTitle
              ? t("common.loading")
              : sessionTitle || t("chat.title")}
          </span>
        </div>

        <div className="header-right">
          <div className="header-subtitle">
            {loadingModel ? (
              <span className="loading-text">{t("chat.loadingModel")}</span>
            ) : currentModel ? (
              <span title={currentModel.name}>{currentModel.name}</span>
            ) : (
              <span className="no-model">{t("chat.noModelConfigured")}</span>
            )}
          </div>

          <div
            ref={navButtonRef}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "5px",
              background: "var(--bg-tertiary, #2d2d2d)",
              border: "1px solid var(--border-color, #444)",
              color: "var(--text-secondary, #aaa)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              handleNavButtonMouseEnter();
            }}
            onMouseLeave={(e) => {
              handleNavButtonMouseLeave();
            }}
            title={t("chat.navigation") || "Navigation"}
          >
            <TaskQueueIcon size={16} />
          </div>
          <button
            onClick={togglePanel}
            title={isCollapsed ? "Expand" : "Collapse"}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "5px",
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {collapseIcon}
          </button>
        </div>
      </div>
      {showNavBubble && (
        <div
          className="chat-nav-bubble"
          style={{
            position: "fixed",
            right: navBubblePosition.right,
            top: navBubblePosition.top,
            minWidth: "300px",
            maxWidth: "360px",
            maxHeight: "600px",
            background: "var(--bg-secondary, #1e1e1e)",
            border: "1px solid var(--border-color, #333)",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            overflow: "hidden",
            zIndex: 100,
            pointerEvents: "auto",
          }}
          onMouseEnter={handleNavBubbleMouseEnter}
          onMouseLeave={handleNavBubbleMouseLeave}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border-color, #333)",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary, #aaa)",
              background: "var(--bg-tertiary, #252525)",
            }}
          >
            {t("chat.navigation") || "Navigation"} (
            {messages.filter((m) => m.role === RoleEnum.User).length})
          </div>
          <div
            style={{
              maxHeight: "340px",
              overflowY: "auto",
              padding: "8px 0",
            }}
          >
            {messages
              .filter((m) => m.role === RoleEnum.User)
              .map((msg, idx) => {
                const isActive = idx === activeNavIndex;
                const preview = msg.content?.slice(0, 45) || "...";
                return (
                  <div
                    key={msg.id}
                    style={{
                      padding: "8px 12px",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderLeft: isActive
                        ? "2px solid var(--accent-color, #00aaff)"
                        : "2px solid transparent",
                      background: isActive
                        ? "var(--hover-bg, #2a2a2a)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onClick={() => {
                      const userMessages = messages.filter(
                        (m) => m.role === RoleEnum.User,
                      );
                      const targetIndex = messages.indexOf(userMessages[idx]);
                      scrollToMessage(targetIndex);
                      setShowNavBubble(false);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--hover-bg, #2a2a2a)";
                      e.currentTarget.style.borderLeftColor =
                        "var(--accent-color, #00aaff)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderLeftColor = "transparent";
                      }
                    }}
                  >
                    <span style={{ fontSize: "14px", flexShrink: 0 }}>💬</span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--text-primary, #fff)",
                      }}
                      title={msg.content}
                    >
                      {preview}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--text-tertiary, #888)",
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="chat-messages-wrapper">
        <div
          className="chat-messages"
          ref={messagesContainerRef}
          onScroll={handleUserScroll}
        >
          {messages.map((msg, index) => {
            const isUser = msg.role === RoleEnum.User;
            const isLastMessage = index === messages.length - 1;
            const formattedTime = formatTimestamp(msg.timestamp);
            return (
              <div
                key={msg.id}
                className={`message-wrapper ${isUser ? "user" : ""}`}
              >
                <div className="message-avatar">
                  {isUser ? (
                    <UserIcon size={16} />
                  ) : (
                    <img
                      src={logo}
                      alt="Hippox LLM"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </div>
                <div className="message-content-area">
                  {msg.status === MessageStatus.Pending ? (
                    <div
                      className="message-bubble"
                      style={{ backgroundColor: "transparent" }}
                    >
                      <div className="message-content">
                        <LoadingSpinner />
                      </div>
                    </div>
                  ) : msg.status &&
                    [
                      MessageStatus.Paused,
                      MessageStatus.Cancelled,
                      MessageStatus.Failed,
                    ].includes(msg.status) ? (
                    <StatusMessage msg={msg} status={msg.status} t={t} />
                  ) : isUser ? (
                    <>
                      {msg.files && msg.files.length > 0 && (
                        <MessageFileGrid
                          files={msg.files}
                          onFileClick={onFileClick}
                          formatFileSize={formatFileSize}
                        />
                      )}
                      {msg.content &&
                        msg.content.trim() &&
                        (editingMessageId === msg.id ? (
                          <EditMessageForm
                            editContent={editContent}
                            setEditContent={setEditContent}
                            onSave={() => handleSaveEdit(msg)}
                            onCancel={handleCancelEdit}
                            t={t}
                          />
                        ) : (
                          <div className="message-bubble">
                            <div className="message-content">{msg.content}</div>
                            <div className="message-time">{formattedTime}</div>
                          </div>
                        ))}
                      <MessageActions
                        msg={msg}
                        isUser={true}
                        copyToClipboard={copyToClipboard}
                        onLocateTask={handleLocateTask}
                        onEditMessage={handleEditMessage}
                        onResendMessage={handleResendMessage}
                        t={t}
                      />
                    </>
                  ) : (
                    (() => {
                      let displayContent = msg.content;
                      let displaySubtitle = null;
                      if (isStructuredLLMResponse(msg.content)) {
                        const parsed = parseLLMResponse(msg.content);
                        if (parsed?.chatResponse) {
                          displayContent = parsed.chatResponse.m;
                          if (parsed.chatResponse.s) {
                            displaySubtitle = parsed.chatResponse.s;
                          }
                        }
                      }
                      return (
                        <>
                          <div className="message-bubble">
                            <div className="message-content">
                              {displayContent}
                            </div>
                            {displaySubtitle && (
                              <div
                                className="message-subtitle"
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text-tertiary)",
                                  marginTop: "6px",
                                  paddingTop: "4px",
                                  borderTop: "1px solid var(--border-color)",
                                }}
                              >
                                {displaySubtitle}
                              </div>
                            )}
                            <div className="message-time">{formattedTime}</div>
                          </div>
                          <MessageActions
                            msg={msg}
                            isUser={false}
                            copyToClipboard={copyToClipboard}
                            onLocateTask={handleLocateTask}
                            onEditMessage={handleEditMessage}
                            t={t}
                          />
                          {isLastMessage &&
                            shouldShowSuggestions(messages) &&
                            suggestionPrompts.length > 0 && (
                              <div className="suggestions-wrapper">
                                <div className="ending-message">
                                  {getEndingMessage()}
                                </div>
                                <div className="suggestions-title">
                                  {t("chat.suggestionsTitle") ||
                                    (language === "zh"
                                      ? "💡 试试这些："
                                      : "💡 Try these:")}
                                </div>
                                <div className="suggestions-container">
                                  {suggestionPrompts.map((prompt, idx) => (
                                    <div
                                      key={idx}
                                      className="suggestion-bubble"
                                      onClick={() =>
                                        handleSuggestionClick(prompt)
                                      }
                                      title={prompt}
                                    >
                                      {prompt.length > 25
                                        ? prompt.slice(0, 25) + "..."
                                        : prompt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {(showScrollButton || showTopScrollButton) && (
          <div
            className="scroll-buttons chat-scroll-buttons"
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            {showTopScrollButton && (
              <button
                style={{ height: "32px", width: "32px", borderRadius: "500px" }}
                className="scroll-btn"
                onClick={scrollToTop}
                title={t("chat.scrollToTop") || "Scroll to top"}
              >
                ▲
              </button>
            )}
            {showScrollButton && (
              <button
                style={{ height: "32px", width: "32px", borderRadius: "500px" }}
                className="scroll-btn"
                onClick={scrollToBottom}
                title={t("chat.scrollToBottom")}
              >
                ▼
              </button>
            )}
          </div>
        )}
      </div>

      <div className="chat-input-section">
        <div
          className={`chat-input-container ${isFocused ? "focused" : ""}`}
          onClick={handleContainerClick}
        >
          <div
            className="file-uploader-container"
            style={{ display: uploadedFiles.length > 0 ? "block" : "none" }}
          >
            <FileUploader
              onFilesAdd={handleFilesAdd}
              onFileRemove={handleFileRemove}
              files={uploadedFiles}
              onDragOverInput={onDragOverInputChange}
            />
          </div>
          <div className="input-textarea-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-textarea-hermes"
              placeholder={t("chat.placeholder")}
              value={inputValue}
              onChange={adjustTextareaHeight}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={1}
            />
          </div>
          <div className="action-buttons-row">
            <div className="left-actions">
              <div
                className="icon-btn"
                ref={attachmentBtnRef}
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                title={t("chat.attachment")}
              >
                <AttachmentIcon size={14} />
              </div>

              <div
                className="icon-btn folder-btn"
                ref={directoryBtnRef}
                onClick={async () => {
                  await loadWorkspaces();
                  setShowDirectoryMenu(!showDirectoryMenu);
                }}
                title={t("chat.selectWorkspace")}
                style={{ minWidth: 0 }}
              >
                <FolderIcon size={14} />
                <span
                  className="folder-name"
                  title={getSelectedWorkspaceName()}
                >
                  {getSelectedWorkspaceName()}
                </span>
                <ChevronRightIcon size={10} className="chevron" />
              </div>
              <div
                className="icon-btn folder-btn"
                ref={workflowBtnRef}
                onClick={() => setShowWorkflowMenu(!showWorkflowMenu)}
                title={t("chat.selectWorkflowMode") || "Workflow Mode"}
                style={{ minWidth: 0 }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M4 7h16M4 12h16M4 17h10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="folder-name" title={selectedWorkflowMode}>
                  {workflowDisplayNames.get(selectedWorkflowMode) ||
                    selectedWorkflowMode}
                </span>
                <ChevronRightIcon size={10} className="chevron" />
              </div>

              {showAttachmentMenu && (
                <div className="attachment-menu" ref={attachmentMenuRef}>
                  <div
                    className="attachment-item"
                    onClick={() => handleAttachment()}
                  >
                    <TextFileIcon size={14} />
                    {t("chat.textFile")}
                  </div>
                  <div
                    className="attachment-item"
                    onClick={() => handleAttachment()}
                  >
                    <ImageIcon size={14} />
                    {t("chat.image")}
                  </div>
                  <div
                    className="attachment-item"
                    onClick={() => handleAttachment()}
                  >
                    <VideoIcon size={14} />
                    {t("chat.video")}
                  </div>
                  <div
                    className="attachment-item"
                    onClick={() => handleAttachment()}
                  >
                    <FileIcon size={14} />
                    {t("chat.skillFile")}
                  </div>
                </div>
              )}
              {showDirectoryMenu && (
                <div className="directory-menu" ref={directoryMenuRef}>
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className={`directory-item ${selectedWorkspaceId === workspace.id ? "selected" : ""}`}
                      onClick={() => handleSelectWorkspace(workspace.id)}
                    >
                      {selectedWorkspaceId === workspace.id ? (
                        <FolderOpenIcon size={16} />
                      ) : (
                        <FolderIcon size={16} />
                      )}
                      <div className="directory-item-content">
                        <div>{workspace.name}</div>
                        <div
                          className="workspace-path"
                          title={workspace.workspace_path}
                        >
                          {workspace.workspace_path}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showWorkflowMenu && (
                <div className="directory-menu" ref={workflowMenuRef}>
                  {workflowModes.map((mode) => (
                    <div
                      key={mode}
                      className={`directory-item ${selectedWorkflowMode === mode ? "selected" : ""}`}
                      onClick={() => handleWorkflowModeChange(mode)}
                    >
                      <div className="directory-item-content">
                        <div>{workflowDisplayNames.get(mode) || mode}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className={`send-icon-btn ${inputValue.trim() || uploadedFiles.length > 0 ? "active" : ""}`}
              onClick={handleSend}
              disabled={!inputValue.trim() && uploadedFiles.length === 0}
              title={t("chat.send")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5L12 19M12 5L5 12M12 5L19 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: "none" }} data-navigation-content>
        {navigation}
      </div>
    </div>
  );
};
export default ChartChatPanel;
