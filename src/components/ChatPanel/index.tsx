import React, { useState, useRef, useEffect } from "react";

import { useEditMessage } from "./hooks";
import {
  NormalMessage,
  StatusMessage,
  LoadingSpinner,
  MessageFileGrid,
  EditMessageForm,
  MessageActions,
} from "./components";
import { LlmInstance, llmCommands } from "../../api/llm";
import { WorkspaceInstance, workspaceCommands } from "../../api/workspace";
import {
  ChatIcon,
  UserIcon,
  BotIcon,
  AttachmentIcon,
  FolderIcon,
  ChevronRightIcon,
  TextFileIcon,
  ImageIcon,
  VideoIcon,
  FileIcon,
  FolderOpenIcon,
} from "../../icons";
import { taskManager } from "../../TaskManager";
import {
  UploadFile,
  ChatMessage,
  RoleEnum,
  MessageStatus,
} from "../../types/type";
import FileUploader from "../FileUploader";
import { showToast, ToastType } from "../Toast";
import { zhDefaultPrompts, enDefaultPrompts } from "../../types/DefaultPrompt";
import { extractUrls, MessageUrlGrid } from "./components/MessageUrlGrid";

interface ChatPanelProps {
  onSendMessage: (
    message: string,
    sessionId: string,
    files?: UploadFile[],
  ) => void | Promise<void>;
  onFileClick?: (file: UploadFile) => void;
  t: (key: string, params?: any) => string;
  language?: string;
  currentSessionId?: string;
  onDragOverInputChange?: (isDragging: boolean) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  onSendMessage,
  onFileClick,
  t,
  language = "zh",
  currentSessionId,
  onDragOverInputChange,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showDirectoryMenu, setShowDirectoryMenu] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceInstance[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [currentModel, setCurrentModel] = useState<LlmInstance | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [suggestionPrompts, setSuggestionPrompts] = useState<string[]>([]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentBtnRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const directoryBtnRef = useRef<HTMLDivElement>(null);
  const directoryMenuRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    editingMessageId,
    editContent,
    setEditContent,
    handleEditMessage,
    handleSaveEdit,
    handleCancelEdit,
  } = useEditMessage({ currentSessionId, onSendMessage, t });

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

  const handleResendMessage = (msg: ChatMessage) => {
    if (isResending) return;

    const sessionId = currentSessionId || "";
    if (!sessionId) {
      showToast(ToastType.SUCCESS, "Session ID cannot be empty.");
      return;
    }

    setIsResending(true);

    const message = msg.content || "";
    const currentFiles = msg.files || [];
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: RoleEnum.User,
      content: message,
      timestamp: new Date().toISOString(),
      files: currentFiles,
    };
    taskManager.addUserMessageToSession(sessionId, userMessage);

    let backendMessage = message;
    if (currentFiles.length > 0) {
      const fileInfo = currentFiles.map((f) => `[📎 ${f.name}]`).join("\n");
      backendMessage = message ? `${message}\n${fileInfo}` : fileInfo;
    }

    Promise.resolve(
      onSendMessage(backendMessage, sessionId, currentFiles),
    ).finally(() => {
      setTimeout(() => setIsResending(false), 100);
    });

    showToast(ToastType.SUCCESS, t("chat.resendSuccess") || "Message resent");
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

  useEffect(() => {
    if (shouldShowSuggestions(messages)) {
      setSuggestionPrompts(getRandomPrompts(6));
    }
  }, [messages, language]);

  const handleSuggestionClick = (prompt: string) => {
    const sessionId = currentSessionId || "";
    if (!sessionId) {
      showToast(ToastType.SUCCESS, "Session ID cannot be empty.");
      return;
    }
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: RoleEnum.User,
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    taskManager.addUserMessageToSession(sessionId, userMessage);
    onSendMessage(prompt, sessionId);
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
    const relatedTask = taskManager
      .getAllTasks()
      .find(
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
      showToast(
        ToastType.SUCCESS,
        t("chat.locatedToTerminal") || "Located To Terminal",
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

  const checkScrollPosition = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setIsAtBottom(atBottom);
    setShowScrollButton(scrollHeight > clientHeight && !atBottom);
    if (atBottom) setUserScrolled(false);
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

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      setUserScrolled(false);
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
      if (!sessionId) {
        showToast(ToastType.SUCCESS, "Session ID cannot be empty.");
        return;
      }
      const message = inputValue.trim() || "";
      const currentFiles = [...uploadedFiles];
      setInputValue("");
      setUploadedFiles([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsSending(true);
      let backendMessage = message;
      Promise.resolve(
        onSendMessage(backendMessage, sessionId, currentFiles),
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

  useEffect(() => {
    const updateMessages = () => {
      if (!currentSessionId) {
        let allMessages = taskManager.getAllMessages();
        if (allMessages.length === 0) {
          const welcomeMsg: ChatMessage = {
            id: "welcome",
            role: RoleEnum.LLM,
            content: t("welcome.message"),
            timestamp: new Date().toISOString(),
          };
          taskManager.addAssistantMessage(welcomeMsg);
          allMessages = [welcomeMsg];
        }
        setMessages(allMessages);
        return;
      }
      const userMessages =
        taskManager.getUserMessagesBySession(currentSessionId);
      const assistantMessages =
        taskManager.getAssistantMessagesBySessionAsArray(currentSessionId);
      let allMessages = [...userMessages, ...assistantMessages].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      if (allMessages.length === 0) {
        const welcomeMsg: ChatMessage = {
          id: "welcome",
          role: RoleEnum.LLM,
          content: t("welcome.message"),
          timestamp: new Date().toISOString(),
        };
        taskManager.addAssistantMessageToSession(currentSessionId, welcomeMsg);
        allMessages = [welcomeMsg];
      }
      setMessages(allMessages);
    };
    updateMessages();
    const unsubscribe = taskManager.subscribe(() => updateMessages());
    return unsubscribe;
  }, [language, currentSessionId, t]);

  useEffect(() => {
    loadCurrentDefaultModel();
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current && !userScrolled) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
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

  return (
    <div className="chat-panel">
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

  .chat-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    flex-shrink: 0;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .title-icon {
    font-size: 16px;
    display: inline-flex;
    align-items: center;
  }

  .header-subtitle {
    font-size: 12px;
    color: var(--text-tertiary);
    background: var(--bg-tertiary);
    padding: 4px 8px;
    border-radius: 20px;
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
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .message-wrapper {
    display: flex;
    gap: 12px;
    animation: fadeIn 0.3s ease;
  }

  .message-wrapper.user {
    flex-direction: row-reverse;
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
  }

  .message-wrapper.user .message-content-area {
    align-items: flex-end;
  }

  .message-bubble {
    padding: 10px 14px;
    border-radius: 18px;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .message-wrapper.user .message-bubble {
    background: var(--accent-color);
    color: white;
  }

  .message-content {
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
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
    transition: all 0.2s ease;
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
    margin: 12px 16px 16px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.2s ease;
    cursor: text;
  }

  .chat-input-container.focused {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }

  .file-uploader-container {
    // border-bottom: 1px solid var(--border-color);
  }

  .input-textarea-wrapper {
    padding: 10px 12px 6px 12px;
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
    padding: 4px 8px 8px 8px;
  }

  .left-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
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
    transition: all 0.2s ease;
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
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }

  .chevron {
    transition: transform 0.2s;
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
    transition: all 0.2s ease;
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
    transition: background 0.2s;
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
    left: 0;
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
    transition: background 0.2s;
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
    transition: all 0.2s ease;
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

  .chat-messages::-webkit-scrollbar {
    width: 6px;
  }

  .chat-messages::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    border-radius: 3px;
  }

  .chat-messages::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }

  .chat-messages::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
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
    margin-top: 12px;
    width: 100%;
  }

  .ending-message {
    text-align: center;
    padding: 10px 12px;
    margin: 8px 0 4px 0;
    font-size: 13px;
    color: var(--text-secondary);
    background: var(--bg-tertiary);
    border-radius: 20px;
    opacity: 0.9;
  }
  
  .suggestions-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    padding: 4px 0;
  }
  
  .suggestion-bubble {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 4px 10px;
    font-size: 11px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  
  .suggestion-bubble:hover {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: white;
    transform: translateY(-1px);
  }

  :root {
    --bg-primary: #0f1117;
    --bg-secondary: #1a1d26;
    --bg-tertiary: #22252f;
    --border-color: #2d303a;
    --text-primary: #e8edf2;
    --text-secondary: #9ca3af;
    --text-tertiary: #6b7280;
    --accent-color: #818cf8;
    --accent-hover: #6366f1;
    --accent-glow: rgba(129, 140, 248, 0.2);
    --hover-bg: rgba(232, 237, 242, 0.08);
  }
  [data-theme="light"] {
    --bg-primary: #f3f4f6;
    --bg-secondary: #ffffff;
    --bg-tertiary: #e5e7eb;
    --border-color: #d1d5db;
    --text-primary: #111827;
    --text-secondary: #4b5563;
    --text-tertiary: #9ca3af;
    --accent-color: #6366f1;
    --accent-hover: #4f46e5;
    --accent-glow: rgba(99, 102, 241, 0.2);
    --hover-bg: rgba(0, 0, 0, 0.04);
  }
`}</style>

      <div
        className="panel-header"
        style={{ paddingTop: "13px", paddingBottom: "13px" }}
      >
        <div className="header-title">
          <span className="title-icon">
            <ChatIcon size={16} />
          </span>
          <span>{t("chat.title")}</span>
        </div>
        <div className="header-subtitle">
          {loadingModel ? (
            <span className="loading-text">{t("chat.loadingModel")}</span>
          ) : currentModel ? (
            <span title={currentModel.name}>{currentModel.name}</span>
          ) : (
            <span className="no-model">{t("chat.noModelConfigured")}</span>
          )}
        </div>
      </div>

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
                  {isUser ? <UserIcon size={16} /> : <BotIcon size={16} />}
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
                      MessageStatus.Completed,
                    ].includes(msg.status) ? (
                    <>
                      <StatusMessage msg={msg} status={msg.status} t={t} />
                    </>
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
                    <>
                      <div className="message-bubble">
                        <div className="message-content">{msg.content}</div>
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
                                  onClick={() => handleSuggestionClick(prompt)}
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
                  )}
                  {(() => {
                    const urls = extractUrls(msg.content);
                    if (urls.length > 0) {
                      return <MessageUrlGrid urls={urls} t={t} />;
                    }
                    return null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
        {showScrollButton && (
          <div className="scroll-buttons chat-scroll-buttons">
            <button
              className="scroll-btn"
              onClick={scrollToBottom}
              title={t("chat.scrollToBottom")}
            >
              ↓
            </button>
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
    </div>
  );
};

export default ChatPanel;
