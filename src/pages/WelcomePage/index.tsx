import React, { useState, useRef, useEffect } from "react";
import banner from "../../assets/banner.svg";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { FolderIcon, ChevronRightIcon, FileIcon, FolderOpenIcon } from "lucide-react";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { workflowCommands } from "../../command/workflow";
import { WorkspaceInstance, workspaceCommands } from "../../command/workspace";
import ArtText from "../../components/arts/ArtText";
import FileUploader from "../../components/FileUploader";
import { showToast, ToastType } from "../../components/Toast";
import { showTooltipOnElement } from "../../components/Tooltip";
import { UploadFile } from "../../core/types";
import { AttachmentIcon, TextFileIcon } from "../../icons";
import { zhDefaultPrompts, enDefaultPrompts } from "../../types/DefaultPrompt";
import { welcomepageStyles } from "./welcomepage.style";
// Inject welcome page styles into the document
if (typeof document !== "undefined") {
  const styleId = "welcomepage-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = welcomepageStyles;
    document.head.appendChild(style);
  }
}
interface WelcomePageProps {
  onSendMessage: (message: string, files?: UploadFile[], workflowMode?: string) => void;
  t: (key: string) => string;
  onDragOverInputChange?: (isDragging: boolean) => void;
  workflowMode?: string;
  onWorkflowModeChange?: (mode: string) => void;
  onNavigateTo?: (page: string) => void;
  /**
   * Callback for navigating to the video editor with a file path.
   * When provided, video/audio/image file uploads will use this to navigate
   * directly to the video editor subsystem.
   */
  onNavigateToVideoEditor?: (filePath: string, fileType: "file" | "download") => void;
}
/**
 * Check if a file is a media file (video, audio, or image) that should
 * be handled by the video editor subsystem.
 */
const isMediaFile = (file: UploadFile): boolean => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const videoExts = ["mp4", "mov", "mkv", "avi", "webm", "flv", "wmv", "m4v"];
  const audioExts = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus"];
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico"];
  return videoExts.includes(ext) || audioExts.includes(ext) || imageExts.includes(ext);
};
/**
 * Check if a file is a text-based file (text or skill file).
 * These files can be used as context for general chat.
 */
const isTextFile = (file: UploadFile): boolean => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const textExts = ["txt", "md", "json", "xml", "csv", "log", "ini", "cfg", "conf", "yaml", "yml", "toml"];
  const skillExts = ["skill", "py", "js", "ts", "rs", "go", "rs", "c", "cpp", "h", "hpp"];
  return textExts.includes(ext) || skillExts.includes(ext);
};
/**
 * Helper function to create an UploadFile object from a File object.
 * This is used for text and skill files that are added to the upload list.
 */
const createUploadFileFromFile = (file: File, path?: string): UploadFile => {
  return {
    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    file: file,
    path: path || file.name,
    status: "uploading" as const,
  } as UploadFile;
};
const WelcomePage: React.FC<WelcomePageProps> = ({ onSendMessage, t, onDragOverInputChange, workflowMode: externalWorkflowMode, onWorkflowModeChange, onNavigateTo, onNavigateToVideoEditor }) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showDirectoryMenu, setShowDirectoryMenu] = useState(false);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceInstance[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [workflowModes, setWorkflowModes] = useState<string[]>([]);
  const [selectedWorkflowMode, setSelectedWorkflowMode] = useState<string>(externalWorkflowMode || "ReAct");
  const attachmentBtnRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const directoryBtnRef = useRef<HTMLDivElement>(null);
  const directoryMenuRef = useRef<HTMLDivElement>(null);
  const workflowBtnRef = useRef<HTMLDivElement>(null);
  const workflowMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [currentPrompts, setCurrentPrompts] = useState<string[]>([]);
  const [language, setLanguage] = useState<"zh" | "en">(t("i18n") === "zh" ? "zh" : "en");
  const isZh = t("i18n") === "zh";
  const [workflowDisplayNames, setWorkflowDisplayNames] = useState<Map<string, string>>(new Map());
  /**
   * Domain cards configuration for the welcome page
   * Each card represents a subsystem that users can navigate to
   */
  const domains: {
    id: "general" | "code" | "map" | "chart" | "video" | "sandbox";
    label: string;
    labelEn: string;
    description: string;
    descriptionEn: string;
    bgEmoji: string;
    pageId: string;
  }[] = [
    {
      id: "general",
      label: "通用对话",
      labelEn: "General Chat",
      description: "日常问答 · 任务执行 · 知识检索",
      descriptionEn: "Daily Q&A · Task Execution · Knowledge Retrieval",
      bgEmoji: "💬",
      pageId: "generalChat",
    },
    {
      id: "code",
      label: "代码编辑",
      labelEn: "Code Editor",
      description: "编写 · 审查 · 重构 · 自动补全",
      descriptionEn: "Write · Review · Refactor · Auto-complete",
      bgEmoji: "💻",
      pageId: "codeEditorChat",
    },
    {
      id: "map",
      label: "地理分析",
      labelEn: "Map Analysis",
      description: "位置标注 · 空间数据 · 路线规划",
      descriptionEn: "Location Tagging · Spatial Data · Route Planning",
      bgEmoji: "🗺️",
      pageId: "mapChat",
    },
    {
      id: "chart",
      label: "金融图表",
      labelEn: "Chart Analysis",
      description: "K线分析 · 技术指标 · 市场研判",
      descriptionEn: "Candlestick · Technical Indicators · Market Analysis",
      bgEmoji: "📊",
      pageId: "chartChat",
    },
    {
      id: "video",
      label: "视频剪辑",
      labelEn: "Video Editor",
      description: "剪辑 · 特效 · 导出 · 多轨道编辑",
      descriptionEn: "Edit · Effects · Export · Multi-track Editing",
      bgEmoji: "🎬",
      pageId: "videoEditor",
    },
    {
      id: "sandbox",
      label: "3D沙盒",
      labelEn: "3D Sandbox",
      description: "三维建模 · 场景构建 · 实时渲染",
      descriptionEn: "3D Modeling · Scene Building · Real-time Rendering",
      bgEmoji: "🧊",
      pageId: "sandbox3d",
    },
  ];
  /**
   * Handle navigation to a page with APP_WINDOW_EVENTS
   * This ensures sidebar icon is highlighted and proper event is dispatched
   */
  const handleNavigate = (pageId: string) => {
    // Map pageId to subsystem
    const pageToSubsystem: Record<string, string> = {
      generalChat: "general",
      chartChat: "chart",
      mapChat: "map",
      codeEditorChat: "codeeditor",
      videoEditor: "video",
      sandbox3d: "sandbox3d",
    };
    const subsystem = pageToSubsystem[pageId] || "general";
    // Dispatch session selected event to update sidebar
    // This will trigger sidebar icon highlight via the Sidebar component's listener
    window.dispatchEvent(
      new CustomEvent(APP_WINDOW_EVENTS.SESSION_SELECTED, {
        detail: {
          sessionId: "",
          title: "",
          subsystem: subsystem,
        },
      }),
    );
    // Also dispatch navigate event if callback provided
    if (onNavigateTo) {
      onNavigateTo(pageId);
    } else {
      window.dispatchEvent(
        new CustomEvent("navigate-to", {
          detail: { page: pageId },
        }),
      );
    }
  };
  /**
   * Load workflow display names from backend
   * These are used to show user-friendly names in the workflow dropdown
   */
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
  useEffect(() => {
    if (externalWorkflowMode) {
      setSelectedWorkflowMode(externalWorkflowMode);
    }
  }, [externalWorkflowMode]);
  /**
   * Get random prompts from the default prompts list
   * These are displayed as example chips on the welcome page
   */
  const getRandomPrompts = (count: number = 20): string[] => {
    const prompts = isZh ? zhDefaultPrompts : enDefaultPrompts;
    const shuffled = [...prompts];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  };
  const refreshPrompts = () => {
    setCurrentPrompts(getRandomPrompts(20));
  };
  // Refresh prompts every 5 seconds for dynamic examples
  useEffect(() => {
    refreshPrompts();
    const interval = setInterval(refreshPrompts, 5000);
    return () => clearInterval(interval);
  }, [language]);
  /**
   * Load workflow modes from backend
   */
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
  /**
   * Load workspaces from backend with retry logic
   */
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
  /**
   * Focus the textarea when container is clicked
   */
  const handleContainerClick = (e: React.MouseEvent) => {
    textareaRef.current?.focus();
  };
  /**
   * Handle workspace selection from dropdown
   */
  const handleSelectWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;
    try {
      await workspaceCommands.setDefaultWorkspace(workspaceId);
      setSelectedWorkspaceId(workspaceId);
      setShowDirectoryMenu(false);
      await loadWorkspaces();
      showToast(ToastType.SUCCESS, t("workspace.defaultSuccess"));
    } catch (error) {
      showToast(ToastType.ERROR, t("workspace.defaultFailed"));
    }
  };
  /**
   * Handle workflow mode change from dropdown
   */
  const handleWorkflowModeChange = (mode: string) => {
    setSelectedWorkflowMode(mode);
    setShowWorkflowMenu(false);
    if (onWorkflowModeChange) {
      onWorkflowModeChange(mode);
    }
  };
  /**
   * Get the name of the selected workspace for display
   */
  const getSelectedWorkspaceName = (): string => {
    const workspace = workspaces.find((w) => w.id === selectedWorkspaceId);
    if (!workspace) return t("chat.selectWorkspace") || "Workspace";
    const path = workspace.workspace_path;
    const normalizedPath = path.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    return parts[parts.length - 1] || workspace.name;
  };
  /**
   * Listen for language change events
   */
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      const newLang = event.detail.language === "zh" ? "zh" : "en";
      setLanguage(newLang);
      loadWorkflowDisplayNames();
    };
    window.addEventListener("language-changed", handleLanguageChange as EventListener);
    return () => window.removeEventListener("language-changed", handleLanguageChange as EventListener);
  }, []);
  // Initialize data on component mount
  useEffect(() => {
    loadWorkspaces();
    loadWorkflowModes();
    loadWorkflowDisplayNames();
  }, []);
  /**
   * Handle click outside to close dropdown menus
   */
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  /**
   * Handle file addition from FileUploader component.
   *
   * If the uploaded files contain any media files (video, audio, image),
   * navigate to the video editor subsystem with the file.
   *
   * Text and SKILL files are handled normally and will be sent
   * with the chat message when the user submits the form.
   */
  const handleFilesAdd = (files: UploadFile[]) => {
    const mediaFiles = files.filter((f) => isMediaFile(f));
    if (mediaFiles.length > 0 && onNavigateToVideoEditor) {
      const firstMediaFile = mediaFiles[0];
      const filePath = firstMediaFile.path;
      if (!filePath) {
        const isZh = language === "zh";
        showToast(ToastType.WARNING, isZh ? "无法获取文件完整路径" : "Cannot get full file path");
        return;
      }
      setShowAttachmentMenu(false);
      onNavigateToVideoEditor(filePath, "file");
      return;
    }
    const textFiles = files.filter((f) => !isMediaFile(f));
    if (textFiles.length === 0) return;
    setUploadedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const newUniqueFiles = textFiles.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...newUniqueFiles];
    });
  };
  /**
   * Remove a file from the uploaded files list
   */
  const handleFileRemove = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };
  /**
   * Handle form submission.
   *
   * If there are text/skill files in the upload list,
   * send them along with the message to start a general chat session.
   *
   * Media files are handled in handleFilesAdd and navigate
   * directly to the video editor, so they won't be present in uploadedFiles.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputValue.trim() || uploadedFiles.length > 0) {
      const message = inputValue.trim();
      const currentFiles = [...uploadedFiles];
      onSendMessage(message, currentFiles, selectedWorkflowMode);
      setInputValue("");
      setUploadedFiles([]);
    }
  };
  /**
   * Handle example prompt click - send the prompt as a message
   */
  const handleExampleClick = (prompt: string) => {
    onSendMessage(prompt, [], selectedWorkflowMode);
  };
  /**
   * Handle attachment menu item clicks.
   *
   * Text and SKILL files are added to the upload list
   * and sent with the chat message.
   *
   * Image, Video, and Audio files trigger navigation to the video editor.
   */
  const handleAttachment = async (type: string) => {
    setShowAttachmentMenu(false);
    const isZh = language === "zh";
    let filters: { name: string; extensions: string[] }[] = [];
    let title = "";
    if (type === "audio") {
      title = isZh ? "选择音频文件" : "Select Audio File";
      filters = [
        { name: isZh ? "音频文件" : "Audio Files", extensions: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus"] },
        { name: isZh ? "所有文件" : "All Files", extensions: ["*"] },
      ];
    } else if (type === "text") {
      title = isZh ? "选择文本文件" : "Select Text File";
      filters = [
        { name: isZh ? "文本文件" : "Text Files", extensions: ["txt", "md", "json", "xml", "csv", "log", "ini", "cfg", "conf", "yaml", "yml", "toml"] },
        { name: isZh ? "所有文件" : "All Files", extensions: ["*"] },
      ];
    } else if (type === "image") {
      title = isZh ? "选择图片文件" : "Select Image File";
      filters = [
        { name: isZh ? "图片文件" : "Image Files", extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico"] },
        { name: isZh ? "所有文件" : "All Files", extensions: ["*"] },
      ];
    } else if (type === "video") {
      title = isZh ? "选择视频文件" : "Select Video File";
      filters = [
        { name: isZh ? "视频文件" : "Video Files", extensions: ["mp4", "mov", "mkv", "avi", "webm", "flv", "wmv", "m4v"] },
        { name: isZh ? "所有文件" : "All Files", extensions: ["*"] },
      ];
    } else if (type === "skill") {
      title = isZh ? "选择技能文件" : "Select Skill File";
      filters = [
        { name: isZh ? "技能文件" : "Skill Files", extensions: ["skill", "py", "js", "ts", "rs", "go", "c", "cpp", "h", "hpp"] },
        { name: isZh ? "所有文件" : "All Files", extensions: ["*"] },
      ];
    } else {
      showToast(ToastType.INFO, t("common.comingSoon") || "TODO");
      return;
    }
    try {
      const selected = await dialogOpen({
        directory: false,
        multiple: false,
        title: title,
        filters: filters,
      });
      if (selected && typeof selected === "string") {
        const filePath = selected;
        const fileName = filePath.split(/[\\/]/).pop() || "unknown";
        if (type === "audio" || type === "image" || type === "video") {
          if (onNavigateToVideoEditor) {
            onNavigateToVideoEditor(filePath, "file");
            showToast(ToastType.INFO, isZh ? `正在打开视频编辑器: ${fileName}` : `Opening video editor: ${fileName}`);
          }
        } else {
          const uploadFile: UploadFile = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: fileName,
            size: 0,
            type: "text/plain",
            file: new File([""], fileName, { type: "text/plain" }),
            path: filePath,
            status: "uploading",
          };
          setUploadedFiles((prev) => [...prev, uploadFile]);
          showToast(ToastType.SUCCESS, isZh ? `已添加: ${fileName}` : `Added: ${fileName}`);
        }
      }
    } catch (error) {
      console.error("File selection error:", error);
    }
  };
  return (
    <div className="welcome-page">
      <div className="welcome-container">
        {/* Logo Section */}
        <div className="welcome-logo">
          <img src={banner} alt="HippoxOS Banner" />
        </div>
        {/* Title Section */}
        <ArtText text={"HippoxOS"} fontSize={52} fontWeight="300" letterSpacing={4} textColor="#818cf8" lightColor="#ffffff" animationDuration={3} glowSize={2} />
        <p className="welcome-subtitle">{t("welcome.subtitle") || "A native LLM operating system"}</p>
        {/* Input Form */}
        <form className="welcome-form" onSubmit={handleSubmit}>
          <div className={`welcome-input-container ${isFocused ? "focused" : ""}`} onClick={handleContainerClick}>
            {/* File Uploader - shows when files are uploaded */}
            <div className="file-uploader-container" style={{ display: uploadedFiles.length > 0 ? "block" : "none" }}>
              <FileUploader onFilesAdd={handleFilesAdd} onFileRemove={handleFileRemove} files={uploadedFiles} onDragOverInput={onDragOverInputChange} />
            </div>
            {/* Text Input Area */}
            <div className="input-textarea-wrapper">
              <textarea
                ref={textareaRef}
                className="welcome-textarea"
                placeholder={t("chat.placeholder") || "Ask me anything..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                rows={1}
                style={{ height: "auto" }}
              />
            </div>
            {/* Action Buttons Row */}
            <div className="action-buttons-row">
              <div className="left-actions">
                {/* Attachment Button */}
                <div className="icon-btn" ref={attachmentBtnRef} onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} title={t("chat.attachment")}>
                  <AttachmentIcon size={14} />
                </div>
                {/* Workspace Selector */}
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
                  <span className="folder-name" title={getSelectedWorkspaceName()}>
                    {getSelectedWorkspaceName()}
                  </span>
                  <ChevronRightIcon size={10} className="chevron" />
                </div>
                {/* Workflow Mode Selector */}
                <div className="icon-btn folder-btn" ref={workflowBtnRef} onClick={() => setShowWorkflowMenu(!showWorkflowMenu)} title={t("chat.selectWorkflowMode") || "Workflow Mode"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="folder-name" title={selectedWorkflowMode}>
                    {workflowDisplayNames.get(selectedWorkflowMode) || selectedWorkflowMode}
                  </span>
                  <ChevronRightIcon size={10} className="chevron" />
                </div>
                {/* Attachment Menu Dropdown */}
                {showAttachmentMenu && (
                  <div className="attachment-menu" ref={attachmentMenuRef}>
                    <div className="attachment-item" onClick={() => handleAttachment("text")}>
                      <TextFileIcon size={14} />
                      {t("chat.textFile") || "Text File"}
                    </div>
                    <div className="attachment-item" onClick={() => handleAttachment("skill")}>
                      <FileIcon size={14} />
                      {t("chat.skillFile") || "Skill File"}
                    </div>
                  </div>
                )}
                {/* Workspace Dropdown Menu */}
                {showDirectoryMenu && (
                  <div className="directory-menu" ref={directoryMenuRef}>
                    {workspaces.map((workspace) => (
                      <div key={workspace.id} className={`directory-item ${selectedWorkspaceId === workspace.id ? "selected" : ""}`} onClick={() => handleSelectWorkspace(workspace.id)}>
                        {selectedWorkspaceId === workspace.id ? <FolderOpenIcon size={16} className="my-folder-icon" /> : <FolderIcon size={16} className="my-folder-icon" />}
                        <div className="directory-item-content">
                          <div style={{ textAlign: "left" }}>{workspace.name}</div>
                          <div className="workspace-path" title={workspace.workspace_path} style={{ textAlign: "left" }}>
                            {workspace.workspace_path}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Workflow Dropdown Menu */}
                {showWorkflowMenu && (
                  <div className="directory-menu" ref={workflowMenuRef}>
                    {workflowModes.map((mode) => (
                      <div key={mode} className={`directory-item ${selectedWorkflowMode === mode ? "selected" : ""}`} onClick={() => handleWorkflowModeChange(mode)}>
                        <div className="directory-item-content">
                          <div style={{ textAlign: "left" }}>{workflowDisplayNames.get(mode) || mode}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Send Button */}
              <button className={`send-icon-btn ${inputValue.trim() || uploadedFiles.length > 0 ? "active" : ""}`} type="submit" disabled={!inputValue.trim() && uploadedFiles.length === 0} title={t("chat.send")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5L12 19M12 5L5 12M12 5L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </form>
        {/* Domain Cards - Each card dispatches SESSION_SELECTED event for sidebar highlight */}
        <div className="domain-cards">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="domain-card"
              onClick={() => {
                // Map domain to subsystem for SESSION_SELECTED event
                const domainToSubsystem: Record<string, string> = {
                  general: "general",
                  code: "codeeditor",
                  map: "map",
                  chart: "chart",
                  video: "video",
                  sandbox: "sandbox3d",
                };
                const subsystem = domainToSubsystem[domain.id] || "general";
                const pageId = domain.pageId;
                // Dispatch SESSION_SELECTED event to update sidebar highlight
                // This ensures the sidebar icon is highlighted when navigating via welcome page cards
                window.dispatchEvent(
                  new CustomEvent(APP_WINDOW_EVENTS.SESSION_SELECTED, {
                    detail: {
                      sessionId: "",
                      title: "",
                      subsystem: subsystem,
                    },
                  }),
                );
                // Navigate to the target page
                handleNavigate(pageId);
              }}
            >
              <div className="card-bg-emoji">{domain.bgEmoji}</div>
              <div className="card-left">
                <div className="domain-name">{isZh ? domain.label : domain.labelEn}</div>
                <div className="domain-desc">{isZh ? domain.description : domain.descriptionEn}</div>
              </div>
              <span className="domain-arrow">→</span>
            </div>
          ))}
        </div>
        {/* Example Prompts Section */}
        <div className="examples-section">
          <div className="examples-title">{t("welcome.examples") || "Try these"}</div>
          <div className="examples-grid">
            {currentPrompts.slice(0, 11).map((prompt, index) => {
              const randomWidths = [150, 170, 190, 210, 160, 180, 200, 220, 155, 175, 195, 215, 165, 185, 205, 225];
              const width = randomWidths[index % randomWidths.length];
              return (
                <div
                  key={index}
                  className="example-chip"
                  style={{ width: `${width}px` }}
                  onClick={() => handleExampleClick(prompt)}
                  onMouseEnter={(e) => {
                    const span = e.currentTarget.querySelector("span:last-child");
                    if (span && span.scrollWidth > span.clientWidth) {
                      showTooltipOnElement(e.currentTarget, prompt);
                    }
                  }}
                  onMouseLeave={() => {
                    const container = document.getElementById("global-tooltip-container");
                    if (container) container.remove();
                  }}
                >
                  <span className="example-icon">💡</span>
                  <span>{prompt.length > 25 ? prompt.slice(0, 25) + "..." : prompt}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
export default WelcomePage;
