import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useEditMessage } from "./hooks";
import { StatusMessage, LoadingSpinner, MessageFileGrid, EditMessageForm, MessageActions } from "./components";
import logo from "../../../assets/logo.png";
import { LlmInstance, llmCommands } from "../../../command/llm";
import { WorkspaceInstance, workspaceCommands } from "../../../command/workspace";
import { workflowCommands } from "../../../command/workflow";
import FileUploader from "../../../components/FileUploader";
import { showToast, ToastType } from "../../../components/Toast";
import { taskManager } from "../../../core/TaskManager";
import { UploadFile, SessionDomain } from "../../../core/types";
import { ChatIcon, TaskQueueIcon, UserIcon, AttachmentIcon, FolderIcon, ChevronRightIcon, TextFileIcon, FileIcon, FolderOpenIcon } from "../../../icons";
import { zhDefaultPrompts, enDefaultPrompts } from "../../../types/DefaultPrompt";
import { ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { sandbox3dSessionCommands } from "../../../command/session/sandbox3d";
import { isStructuredLLMResponse, parseLLMResponse } from "../llm/utils";
import { SandBox3DRef } from "../SandBox3D";
import { dispatchRefresh3DHistory } from "../SandBox3DWindowsEventsManager";
import { filesCommands } from "../../../command/files";
interface SandBox3DChatPanelProps {
  onSendMessage: (message: string, sessionId: string, files?: UploadFile[], workflowMode?: string) => void | Promise<void>;
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
  /** Reference to the 3D sandbox for executing code */
  sandboxRef?: React.RefObject<SandBox3DRef | null>;
}
/**
 * SandBox3DChatPanel - Chat interface for 3D sandbox
 * Supports file upload with filtering for text and skill files
 */
const SandBox3DChatPanel: React.FC<SandBox3DChatPanelProps> = ({ onSendMessage, onFileClick, t, language = "zh", currentSessionId, onDragOverInputChange, navigationContent, isLeftPanel = true, onWorkflowModeChange, isCollapsed = false, togglePanel, collapseIcon: collapseIconProp, sandboxRef }) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showDirectoryMenu, setShowDirectoryMenu] = useState(false);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceInstance[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [workflowModes, setWorkflowModes] = useState<string[]>([]);
  const [selectedWorkflowMode, setSelectedWorkflowMode] = useState<string>("ReAct");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [currentModel, setCurrentModel] = useState<LlmInstance | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [suggestionPrompts, setSuggestionPrompts] = useState<string[]>([]);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [showNavBubble, setShowNavBubble] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
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
  const [workflowDisplayNames, setWorkflowDisplayNames] = useState<Map<string, string>>(new Map());
  const [showTopScrollButton, setShowTopScrollButton] = useState(false);
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  const hasLoadedTitleRef = useRef<Record<string, boolean>>({});
  const collapseIcon = collapseIconProp || (isLeftPanel ? (isCollapsed ? "≫" : "≪") : isCollapsed ? "≪" : "≫");
  const welcomeMsg = useMemo<ChatMessage>(
    () => ({
      id: "welcome",
      role: RoleEnum.LLM,
      content: language === "zh" ? "🎨 欢迎来到 Hippox 3D 沙盒！我可以帮你创建 3D 场景、模型和动画。告诉我你想构建什么～" : "🎨 Welcome to Hippox 3D Sandbox! I can help you create 3D scenes, models, and animations. Tell me what you'd like to build～",
      timestamp: new Date().toISOString(),
    }),
    [language],
  );
  // Load session title from backend
  const loadSessionTitle = async (sessionId: string) => {
    if (!sessionId || sessionId.startsWith("pending_") || sessionId.startsWith("temp_")) {
      setSessionTitle("");
      return;
    }
    if (hasLoadedTitleRef.current[sessionId]) {
      return;
    }
    setIsLoadingTitle(true);
    try {
      const list = await sandbox3dSessionCommands.listSandBox3DSessions();
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
        localStorage.setItem(`video_session_title_${sessionId}`, title);
      }
    };
    window.addEventListener("session-title-updated", handleSessionTitleUpdated as EventListener);
    return () => {
      window.removeEventListener("session-title-updated", handleSessionTitleUpdated as EventListener);
    };
  }, [currentSessionId]);
  const { editingMessageId, editContent, setEditContent, handleEditMessage, handleSaveEdit, handleCancelEdit } = useEditMessage({ currentSessionId, onSendMessage, t });
  const loadWorkflowDisplayNames = async () => {
    try {
      const lang = localStorage.getItem("hippox-language") || "en";
      const modes = await workflowCommands.getWorkflowModeNames();
      const displayNames = new Map<string, string>();
      for (const mode of modes) {
        const displayName = await workflowCommands.workflowModeDisplayNameByLang(mode, lang);
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
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
  // Update active nav index based on scroll position
  const handleScrollUpdate = useCallback(() => {
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
  }, []);
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
    Promise.resolve(onSendMessage(message, sessionId, currentFiles)).finally(() => {
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
    onSendMessage(prompt, sessionId, undefined, selectedWorkflowMode);
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
  const handleLocateTask = (msg: ChatMessage) => {
    const relatedTask = taskManager.getAllTasks().find((task) => task.user_input === msg.content || task.final_output === msg.content || task.task_id === (msg as any).relatedTaskId);
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
  const loadCurrentDefaultModel = async () => {
    try {
      setLoadingModel(true);
      const defaultId = await llmCommands.getDefaultLlmInstanceId();
      if (defaultId) {
        const instances = await llmCommands.getLlmInstances();
        const instancesList = Object.values(instances) as LlmInstance[];
        const defaultModel = instancesList.find((inst) => inst.id === defaultId);
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
    if (!sessionId || sessionId.startsWith("pending_") || sessionId.startsWith("temp_")) {
      return;
    }
    try {
      const cached = localStorage.getItem(`video_workflow_mode_${sessionId}`);
      if (cached) {
        setSelectedWorkflowMode(cached);
        return;
      }
      const config = await sandbox3dSessionCommands.loadSandBox3DSessionConfig(sessionId);
      if (config && config.workflow_mode) {
        setSelectedWorkflowMode(config.workflow_mode);
        localStorage.setItem(`video_workflow_mode_${sessionId}`, config.workflow_mode);
      } else {
        const defaultMode = "ReAct";
        setSelectedWorkflowMode(defaultMode);
        await sandbox3dSessionCommands.updateSandBox3DSessionConfig(sessionId, {
          workflow_mode: defaultMode,
        });
        localStorage.setItem(`video_workflow_mode_${sessionId}`, defaultMode);
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
    if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_")) {
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
    window.addEventListener("video-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("video-session-created", handleSessionCreated);
    };
  }, [currentSessionId]);
  const checkScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setIsAtBottom(atBottom);
    setShowScrollButton(scrollHeight > clientHeight && !atBottom);
    setShowTopScrollButton(scrollTop > 50);
    if (atBottom) setUserScrolled(false);
    handleScrollUpdate();
  }, [handleScrollUpdate]);
  const handleUserScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
      if (!atBottom) setUserScrolled(true);
    }
    checkScrollPosition();
  }, [checkScrollPosition]);
  const scrollToTop = () => {
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  };
  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({
      index: messages.length - 1,
      align: "end",
      behavior: "smooth",
    });
    setUserScrolled(false);
  };
  const scrollToMessage = (index: number) => {
    if (index >= 0 && index < messages.length) {
      virtuosoRef.current?.scrollToIndex({
        index,
        align: "center",
        behavior: "smooth",
      });
      setActiveNavIndex(index);
    }
  };
  const handleFilesAdd = (files: UploadFile[]) => {
    setUploadedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const newUniqueFiles = files.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...newUniqueFiles];
    });
  };
  const handleFileRemove = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };
  /**
   * Open file selector with specific file type filters
   * @param filterType - Type of files to filter: 'text' | 'image' | 'video' | 'skill'
   */
  const openFileSelector = async (filterType: "text" | "skill" = "text") => {
    try {
      const allowedExtensions: Record<string, string[]> = {
        text: ["txt", "md", "json", "js", "ts", "py", "rs", "html", "css", "xml", "yaml", "yml", "toml", "sh", "bash"],
        skill: ["md", "skill"],
      };
      const validExtensions = allowedExtensions[filterType] || [];
      let filters: { name: string; extensions: string[] }[] = [];
      switch (filterType) {
        case "text":
          filters = [{ name: "Text Files", extensions: validExtensions }];
          break;
        case "skill":
          filters = [{ name: "Skill Files", extensions: validExtensions }];
          break;
        default:
          filters = [{ name: "All Files", extensions: ["*"] }];
      }
      const result = await filesCommands.selectFile({
        multiple: true,
        filters: filters,
      });
      if (!result) return;
      const selectedFiles = Array.isArray(result) ? result : [result];
      const newFiles: UploadFile[] = [];
      let skippedCount = 0;
      for (const path of selectedFiles) {
        const ext = path.split(".").pop()?.toLowerCase() || "";
        if (!validExtensions.includes(ext)) {
          skippedCount++;
          continue;
        }
        const fileInfo = await filesCommands.getFileInfo(path);
        const isSkill = path.toLowerCase().endsWith(".md") || path.toLowerCase().endsWith(".skill.md") || path.toLowerCase().endsWith(".skill");
        let content = "";
        try {
          content = await filesCommands.readTextFile(path);
        } catch (e) {
          console.debug("Cannot read file content:", path);
        }
        let fileType = "application/octet-stream";
        if (isSkill) {
          fileType = "text/markdown";
        } else if (path.endsWith(".txt")) {
          fileType = "text/plain";
        } else if (path.endsWith(".json")) {
          fileType = "application/json";
        } else if (path.endsWith(".js") || path.endsWith(".ts")) {
          fileType = "text/javascript";
        } else if (path.endsWith(".py")) {
          fileType = "text/x-python";
        } else if (path.endsWith(".rs")) {
          fileType = "text/x-rust";
        } else if (path.endsWith(".html") || path.endsWith(".htm")) {
          fileType = "text/html";
        } else if (path.endsWith(".css")) {
          fileType = "text/css";
        } else if (path.endsWith(".xml")) {
          fileType = "text/xml";
        } else if (path.endsWith(".yaml") || path.endsWith(".yml")) {
          fileType = "text/yaml";
        } else if (path.endsWith(".toml")) {
          fileType = "text/toml";
        } else if (path.endsWith(".sh") || path.endsWith(".bash")) {
          fileType = "text/x-shellscript";
        }
        const fileName = fileInfo.name;
        const fileBlob = new Blob([content], { type: fileType });
        const fileObj = new File([fileBlob], fileName, { type: fileType });
        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          file: fileObj,
          name: fileName,
          size: fileInfo.size,
          path: path,
          content: content,
          type: fileType,
          status: "success" as const,
        });
      }
      if (skippedCount > 0) {
        showToast(ToastType.WARNING, `${skippedCount} file(s) skipped. Only ${filterType} files are allowed.`);
      }
      if (newFiles.length === 0) {
        showToast(ToastType.INFO, `No valid ${filterType} files selected`);
        return;
      }
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      showToast(ToastType.SUCCESS, `Added ${newFiles.length} file(s)`);
    } catch (error) {
      console.error("Failed to select files:", error);
      showToast(ToastType.ERROR, "Failed to select files: " + error);
    }
  };
  const handleSend = () => {
    if (isSending) return;
    if (inputValue.trim() || uploadedFiles.length > 0) {
      const sessionId = currentSessionId || "";
      if (!sessionId) {
        showToast(ToastType.SUCCESS, "Session ID cannot be empty.");
        return;
      }
      let message = inputValue.trim() || "";
      for (const file of uploadedFiles) {
        if (file.content) {
          const isSkill = file.name?.toLowerCase().endsWith(".md") || file.name?.toLowerCase().endsWith(".skill.md");
          if (isSkill) {
            let skillName = file.name;
            const lines = file.content.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("# ")) {
                skillName = trimmed.replace("# ", "").trim();
                break;
              }
            }
            message += `\n\n📎 **Skill: ${skillName}**\n\`\`\`markdown\n${file.content}\n\`\`\``;
          } else {
            message += `\n\n📎 **${file.name}**\n\`\`\`\n${file.content}\n\`\`\``;
          }
        }
      }
      const currentFiles = [...uploadedFiles];
      setInputValue("");
      setUploadedFiles([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsSending(true);
      Promise.resolve(onSendMessage(message, sessionId, currentFiles, selectedWorkflowMode)).finally(() => {
        setTimeout(() => setIsSending(false), 100);
      });
    }
  };
  // Update the handleKeyDown function to stop propagation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation(); // Prevent keyboard events from bubbling up
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
    if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_")) {
      try {
        await sandbox3dSessionCommands.updateSandBox3DSessionConfig(currentSessionId, {
          workflow_mode: mode,
        });
        localStorage.setItem(`video_workflow_mode_${currentSessionId}`, mode);
      } catch (error) {
        console.error("Failed to save workflow mode:", error);
        showToast(ToastType.ERROR, "Failed to save workflow mode");
      }
    } else {
      const key = currentSessionId || "pending";
      localStorage.setItem(`video_workflow_mode_${key}`, mode);
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
                border: isActive ? "1px solid var(--accent-color)" : "1px solid var(--border-color)",
                background: isActive ? "var(--accent-glow)" : "var(--bg-tertiary)",
                color: isActive ? "var(--accent-color)" : "var(--text-secondary)",
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
  useEffect(() => {
    const updateMessages = () => {
      if (!currentSessionId) {
        setMessages([welcomeMsg]);
        return;
      }
      const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.SandBox3D);
      const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.SandBox3D);
      const messageMap = new Map<string, ChatMessage>();
      const allMessages = [...userMessages, ...assistantMessages];
      allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      allMessages.forEach((msg) => {
        if (msg && msg.id) {
          messageMap.set(msg.id, msg);
        }
      });
      const result = Array.from(messageMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (result.length === 0) {
        setMessages([welcomeMsg]);
      } else {
        setMessages(result);
      }
    };
    updateMessages();
    const unsubscribe = taskManager.subscribe(() => updateMessages());
    return unsubscribe;
  }, [language, currentSessionId, t]);
  useEffect(() => {
    const handleLanguageChange = () => {
      loadWorkflowDisplayNames();
    };
    window.addEventListener("language-changed", handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener("language-changed", handleLanguageChange as EventListener);
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
            contentMatch = msg.content === task.user_input || msg.content.includes(task.user_input) || task.user_input.includes(msg.content);
          }
          let filesMatch = false;
          if (msg.files && msg.files.length > 0 && (task as any).files) {
            const taskFiles = (task as any).files || [];
            filesMatch = msg.files.some((f: any) => taskFiles.some((tf: any) => f.name === tf.name || f.path === tf.path));
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
  // Scroll to bottom when new messages arrive and user hasn't scrolled up
  useEffect(() => {
    if (messages.length > 0 && !userScrolled) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: "end",
        behavior: "auto",
      });
    }
  }, [messages, userScrolled]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node) && attachmentBtnRef.current && !attachmentBtnRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
      if (directoryMenuRef.current && !directoryMenuRef.current.contains(event.target as Node) && directoryBtnRef.current && !directoryBtnRef.current.contains(event.target as Node)) {
        setShowDirectoryMenu(false);
      }
      if (workflowMenuRef.current && !workflowMenuRef.current.contains(event.target as Node) && workflowBtnRef.current && !workflowBtnRef.current.contains(event.target as Node)) {
        setShowWorkflowMenu(false);
      }
      if (navButtonRef.current && !navButtonRef.current.contains(event.target as Node) && !document.querySelector(".chat-nav-bubble")?.contains(event.target as Node)) {
        setShowNavBubble(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const getEndingMessage = () => {
    return t("chat.endingMessage") || (language === "zh" ? "✨ 我还能为你做些什么吗？ ✨" : "✨ What else can I do for you? ✨");
  };
  const navigation = buildNavigationContent();
  // Render a single message item for Virtuoso
  const renderMessageItem = useCallback(
    (index: number, msg: ChatMessage) => {
      const isUser = msg.role === RoleEnum.User;
      const isLastMessage = index === messages.length - 1;
      const formattedTime = formatTimestamp(msg.timestamp);
      return (
        <div key={msg.id} className={`message-wrapper ${isUser ? "user" : ""}`}>
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
              <div className="message-bubble" style={{ backgroundColor: "transparent" }}>
                <div className="message-content">
                  <LoadingSpinner />
                </div>
              </div>
            ) : msg.status && [MessageStatus.Paused, MessageStatus.Cancelled, MessageStatus.Failed].includes(msg.status) ? (
              <StatusMessage msg={msg} status={msg.status} t={t} />
            ) : isUser ? (
              <>
                {msg.files && msg.files.length > 0 && <MessageFileGrid files={msg.files} onFileClick={onFileClick} formatFileSize={formatFileSize} />}
                {msg.content &&
                  msg.content.trim() &&
                  (editingMessageId === msg.id ? (
                    <EditMessageForm editContent={editContent} setEditContent={setEditContent} onSave={() => handleSaveEdit(msg)} onCancel={handleCancelEdit} t={t} />
                  ) : (
                    <div className="message-bubble">
                      <div className="message-content">{msg.content}</div>
                      <div className="message-time">{formattedTime}</div>
                    </div>
                  ))}
                <MessageActions msg={msg} isUser={true} copyToClipboard={copyToClipboard} onLocateTask={handleLocateTask} onEditMessage={handleEditMessage} onResendMessage={handleResendMessage} t={t} />
              </>
            ) : (
              (() => {
                let displayContent = msg.content;
                let displaySubtitle = null;
                // Check if this is a structured LLM response
                if (isStructuredLLMResponse(msg.content)) {
                  const parsed = parseLLMResponse(msg.content);
                  if (parsed?.chatResponse) {
                    displayContent = parsed.chatResponse.m;
                    if (parsed.chatResponse.s) {
                      displaySubtitle = parsed.chatResponse.s;
                    }
                  }
                  // Note: 3D code execution is handled in the useEffect above
                }
                return (
                  <>
                    <div className="message-bubble">
                      <div className="message-content">{displayContent}</div>
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
                    <MessageActions msg={msg} isUser={false} copyToClipboard={copyToClipboard} onLocateTask={handleLocateTask} onEditMessage={handleEditMessage} t={t} />
                    {isLastMessage && shouldShowSuggestions(messages) && suggestionPrompts.length > 0 && (
                      <div className="suggestions-wrapper">
                        <div className="ending-message">{getEndingMessage()}</div>
                        <div className="suggestions-title">{t("chat.suggestionsTitle") || (language === "zh" ? "💡 试试这些：" : "💡 Try these:")}</div>
                        <div className="suggestions-container">
                          {suggestionPrompts.map((prompt, idx) => (
                            <div key={idx} className="suggestion-bubble" onClick={() => handleSuggestionClick(prompt)} title={prompt}>
                              {prompt.length > 25 ? prompt.slice(0, 25) + "..." : prompt}
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
    },
    [messages, editingMessageId, editContent, suggestionPrompts, t, language, onFileClick, onSendMessage],
  );
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
  /**
   * Process LLM response and execute 3D code if present
   * This is the key integration point between chat and 3D sandbox
   * It runs whenever messages change and checks the latest LLM message
   */
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Check if there's a new LLM message with 3D code to execute
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    if (!lastMsg || lastMsg.role !== RoleEnum.LLM) return;
    if (lastMsg.status === MessageStatus.Pending) return;
    if (lastMsg.status === MessageStatus.Failed) return;
    if (lastMsg.status === MessageStatus.Cancelled) return;
    if (processedMessageIdsRef.current.has(lastMsg.id)) {
      return;
    }
    // Check if the message contains structured LLM response
    if (isStructuredLLMResponse(lastMsg.content)) {
      const parsed = parseLLMResponse(lastMsg.content);
      if (parsed?.terminalResponse?.threeScene?.code) {
        const threeScene = parsed.terminalResponse.threeScene;
        // Execute the 3D code in the sandbox
        if (sandboxRef?.current) {
          sandboxRef.current.executeThreeCode(threeScene.code, threeScene.clearBeforeExecute !== false);
          dispatchRefresh3DHistory({ sessionId: currentSessionId });
          processedMessageIdsRef.current.add(lastMsg.id);
        } else {
          console.warn("[SandBox3DChatPanel] Sandbox ref not available for 3D code execution");
        }
      }
    }
  }, [messages, sandboxRef]);
  /**
   * Listen for 3D code execution events from the sandbox
   * Shows toast notifications for success/error
   */
  useEffect(() => {
    const handleExecutionSuccess = () => {
      // Toast is already shown by the sandbox
    };
    const handleExecutionError = (event: CustomEvent) => {
      const { error } = event.detail;
      showToast(ToastType.ERROR, `3D Code Error: ${error}`);
    };
    window.addEventListener("sandbox3d-execution-success", handleExecutionSuccess as EventListener);
    window.addEventListener("sandbox3d-execution-error", handleExecutionError as EventListener);
    return () => {
      window.removeEventListener("sandbox3d-execution-success", handleExecutionSuccess as EventListener);
      window.removeEventListener("sandbox3d-execution-error", handleExecutionError as EventListener);
    };
  }, []);
  // RENDER
  return (
    <div
      className="sandbox3d-chat-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        minWidth: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        flexShrink: 0,
        flexGrow: 0,
      }}
    >
      <div className="panel-header" style={{ paddingTop: "6px", paddingBottom: "6px" }}>
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
            {isLoadingTitle ? t("common.loading") : sessionTitle || t("chat.title")}
          </span>
        </div>
        <div className="header-right">
          <div className="header-subtitle">{loadingModel ? <span className="loading-text">{t("chat.loadingModel")}</span> : currentModel ? <span title={currentModel.name}>{currentModel.name}</span> : <span className="no-model">{t("chat.noModelConfigured")}</span>}</div>
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
            {t("chat.navigation") || "Navigation"} ({messages.filter((m) => m.role === RoleEnum.User).length})
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
                      borderLeft: isActive ? "2px solid var(--accent-color, #00aaff)" : "2px solid transparent",
                      background: isActive ? "var(--hover-bg, #2a2a2a)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onClick={() => {
                      const userMessages = messages.filter((m) => m.role === RoleEnum.User);
                      const targetIndex = messages.indexOf(userMessages[idx]);
                      scrollToMessage(targetIndex);
                      setShowNavBubble(false);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--hover-bg, #2a2a2a)";
                      e.currentTarget.style.borderLeftColor = "var(--accent-color, #00aaff)";
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
        <div className="chat-messages" ref={messagesContainerRef} style={{ height: "100%", width: "100%", position: "relative" }}>
          {messages.length > 0 ? (
            <Virtuoso
              ref={virtuosoRef}
              data={messages}
              style={{ height: "100%", width: "100%" }}
              itemContent={renderMessageItem}
              // Track scroll position to update scroll buttons
              atBottomStateChange={(atBottom) => {
                setIsAtBottom(atBottom);
                if (atBottom) {
                  setUserScrolled(false);
                  setShowScrollButton(false);
                } else {
                  setShowScrollButton(true);
                }
              }}
              // Track user scroll for auto-scroll behavior
              onScroll={(e) => {
                const target = e.target as HTMLElement;
                if (target) {
                  const { scrollTop, scrollHeight, clientHeight } = target;
                  const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
                  if (!atBottom) {
                    setUserScrolled(true);
                  }
                  setShowTopScrollButton(scrollTop > 50);
                  // Update active nav index
                  requestAnimationFrame(() => {
                    handleScrollUpdate();
                  });
                }
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
              }}
            >
              {t("chat.empty") || "No messages yet"}
            </div>
          )}
        </div>
        {(showScrollButton || showTopScrollButton) && (
          <div className="scroll-buttons chat-scroll-buttons" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {showTopScrollButton && (
              <button style={{ height: "32px", width: "32px", borderRadius: "500px" }} className="scroll-btn" onClick={scrollToTop} title={t("chat.scrollToTop") || "Scroll to top"}>
                <ChevronUp size={18} />
              </button>
            )}
            {showScrollButton && (
              <button style={{ height: "32px", width: "32px", borderRadius: "500px" }} className="scroll-btn" onClick={scrollToBottom} title={t("chat.scrollToBottom")}>
                <ChevronDown size={18} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="chat-input-section">
        <div className={`chat-input-container ${isFocused ? "focused" : ""}`} onClick={handleContainerClick}>
          <div className="file-uploader-container" style={{ display: uploadedFiles.length > 0 ? "block" : "none" }}>
            <FileUploader onFilesAdd={handleFilesAdd} onFileRemove={handleFileRemove} files={uploadedFiles} onDragOverInput={onDragOverInputChange} />
          </div>
          <div className="input-textarea-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-textarea-hermes"
              placeholder={t("chat.placeholder")}
              value={inputValue}
              onChange={adjustTextareaHeight}
              onKeyDown={handleKeyDown}
              onKeyUp={(e) => e.stopPropagation()}
              onKeyPress={(e) => e.stopPropagation()}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={1}
            />
          </div>
          <div className="action-buttons-row">
            <div className="left-actions">
              <div className="icon-btn" ref={attachmentBtnRef} onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} title={t("chat.attachment")}>
                <AttachmentIcon size={14} />
              </div>
              {/* workspace */}
              {/* <div
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
                <span className="folder-name" title={getSelectedWorkspaceName()}>
                  {getSelectedWorkspaceName()}
                </span>
                <ChevronRightIcon size={10} className="chevron" />
              </div> */}
              <div className="icon-btn folder-btn" ref={workflowBtnRef} onClick={() => setShowWorkflowMenu(!showWorkflowMenu)} title={t("chat.selectWorkflowMode") || "Workflow Mode"} style={{ minWidth: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="folder-name" title={selectedWorkflowMode}>
                  {workflowDisplayNames.get(selectedWorkflowMode) || selectedWorkflowMode}
                </span>
                <ChevronRightIcon size={10} className="chevron" />
              </div>
              {showAttachmentMenu && (
                <div className="attachment-menu" ref={attachmentMenuRef}>
                  <div className="attachment-item" onClick={() => openFileSelector("text")}>
                    <TextFileIcon size={14} />
                    {t("chat.textFile")}
                  </div>
                  <div className="attachment-item" onClick={() => openFileSelector("skill")}>
                    <FileIcon size={14} />
                    {t("chat.skillFile")}
                  </div>
                </div>
              )}
              {showDirectoryMenu && (
                <div className="directory-menu" ref={directoryMenuRef}>
                  {workspaces.map((workspace) => (
                    <div key={workspace.id} className={`directory-item ${selectedWorkspaceId === workspace.id ? "selected" : ""}`} onClick={() => handleSelectWorkspace(workspace.id)}>
                      {selectedWorkspaceId === workspace.id ? <FolderOpenIcon size={16} /> : <FolderIcon size={16} />}
                      <div className="directory-item-content">
                        <div>{workspace.name}</div>
                        <div className="workspace-path" title={workspace.workspace_path}>
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
                    <div key={mode} className={`directory-item ${selectedWorkflowMode === mode ? "selected" : ""}`} onClick={() => handleWorkflowModeChange(mode)}>
                      <div className="directory-item-content">
                        <div>{workflowDisplayNames.get(mode) || mode}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className={`send-icon-btn ${inputValue.trim() || uploadedFiles.length > 0 ? "active" : ""}`} onClick={handleSend} disabled={!inputValue.trim() && uploadedFiles.length === 0} title={t("chat.send")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5L12 19M12 5L5 12M12 5L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
export default SandBox3DChatPanel;
