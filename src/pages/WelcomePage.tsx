import React, { useState, useRef, useEffect } from "react";
import {
  AttachmentIcon,
  FolderIcon,
  ChevronRightIcon,
  FolderOpenIcon,
} from "../icons";
import { showToast, ToastType } from "../components/Toast";
import FileUploader from "../components/FileUploader";
import { zhDefaultPrompts, enDefaultPrompts } from "../types/DefaultPrompt";
import { showTooltipOnElement } from "../components/Tooltip";
import { WorkspaceInstance, workspaceCommands } from "../command/workspace";
import { workflowCommands } from "../command/workflow";
import { UploadFile } from "../core/types";
import ArtText from "../components/arts/ArtText";
import banner from "../assets/banner.svg";

interface WelcomePageProps {
  onSendMessage: (
    message: string,
    files?: UploadFile[],
    workflowMode?: string,
  ) => void;
  t: (key: string) => string;
  onDragOverInputChange?: (isDragging: boolean) => void;
  workflowMode?: string;
  onWorkflowModeChange?: (mode: string) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({
  onSendMessage,
  t,
  onDragOverInputChange,
  workflowMode: externalWorkflowMode,
  onWorkflowModeChange,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showDirectoryMenu, setShowDirectoryMenu] = useState(false);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceInstance[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [workflowModes, setWorkflowModes] = useState<string[]>([]);
  const [selectedWorkflowMode, setSelectedWorkflowMode] = useState<string>(
    externalWorkflowMode || "ReAct",
  );
  const attachmentBtnRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const directoryBtnRef = useRef<HTMLDivElement>(null);
  const directoryMenuRef = useRef<HTMLDivElement>(null);
  const workflowBtnRef = useRef<HTMLDivElement>(null);
  const workflowMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [currentPrompts, setCurrentPrompts] = useState<string[]>([]);
  const [language, setLanguage] = useState<"zh" | "en">(
    t("welcome.subtitle") === "原生 LLM 操作系统" ? "zh" : "en",
  );

  useEffect(() => {
    if (externalWorkflowMode) {
      setSelectedWorkflowMode(externalWorkflowMode);
    }
  }, [externalWorkflowMode]);

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

  useEffect(() => {
    refreshPrompts();
    const interval = setInterval(refreshPrompts, 5000);
    return () => clearInterval(interval);
  }, [language]);

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

  const handleContainerClick = (e: React.MouseEvent) => {
    textareaRef.current?.focus();
  };

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

  const handleWorkflowModeChange = (mode: string) => {
    setSelectedWorkflowMode(mode);
    setShowWorkflowMenu(false);
    if (onWorkflowModeChange) {
      onWorkflowModeChange(mode);
    }
  };

  const getSelectedWorkspaceName = (): string => {
    const workspace = workspaces.find((w) => w.id === selectedWorkspaceId);
    if (!workspace) return t("chat.selectWorkspace") || "Workspace";
    const path = workspace.workspace_path;
    const normalizedPath = path.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    return parts[parts.length - 1] || workspace.name;
  };

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      const newLang = event.detail.language === "zh" ? "zh" : "en";
      setLanguage(newLang);
    };
    window.addEventListener(
      "language-changed",
      handleLanguageChange as EventListener,
    );
    return () =>
      window.removeEventListener(
        "language-changed",
        handleLanguageChange as EventListener,
      );
  }, []);

  useEffect(() => {
    loadWorkspaces();
    loadWorkflowModes();
  }, []);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleExampleClick = (prompt: string) => {
    onSendMessage(prompt, [], selectedWorkflowMode);
  };

  const handleAttachment = (type: string) => {
    setShowAttachmentMenu(false);
    showToast(ToastType.INFO, t("common.comingSoon") || "TODO");
  };

  const isZh = t("welcome.subtitle") === "原生 LLM 操作系统";

  return (
    <div className="welcome-page">
      <style>{`
  .my-folder-icon {
  }

  .welcome-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    width: 100%;
    background: var(--bg-primary);
  }

  .welcome-container {
    max-width: 830px;
    width: 85%;
    text-align: center;
    padding: 40px 20px;
  }

  .welcome-logo {
    margin: 0 auto 20px auto;
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
    height: 170px;
    border-radius: 5px;
  }

  .welcome-logo img {
    height: 170px;
    border-radius: 5px;
  }

  .welcome-title {
    font-size: 32px;
    font-weight: 600;
    background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-color, #818cf8) 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 5px;
  }

  .welcome-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 20px 0px;
  }

  .welcome-form {
    width: 80%;
    min-width: 325px;
    margin-bottom: 20px;
    margin: 0 auto 20px auto;
  }

  .welcome-input-container {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    // transition: all 0.2s ease;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    cursor: text;
  }

  .welcome-input-container.focused {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }

  .input-textarea-wrapper {
    padding: 12px 12px 8px 12px;
    flex: 1;
  }

  .welcome-textarea {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    outline: none;
    font-family: inherit;
    min-height: 60px;
    padding: 0;
  }

  .welcome-textarea::placeholder {
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
    // transition: all 0.2s ease;
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
    // transition: transform 0.2s;
  }

  .attachment-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px 0;
    min-width: 120px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }

  .attachment-item {
    padding: 8px 12px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 12px;
    // transition: background 0.2s;
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
    border-radius: 8px;
    padding: 4px 0;
    min-width: 160px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }

  .directory-item {
    padding: 8px 12px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 12px;
    // transition: background 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .directory-item:hover {
    background: var(--hover-bg);
  }

  .directory-item.selected {
    background: var(--accent-color);
    color: white;
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
    // transition: all 0.2s ease;
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

  .examples-section {
    margin-top: 8px;
  }

  .examples-title {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }

 .examples-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 800px;
  margin: 0 auto;
}

.example-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  // transition: all 0.2s ease;
  font-size: 11px;
  color: var(--text-secondary);
  width: auto;
  white-space: nowrap;
}

.example-chip span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

  .example-chip:hover {
    background: var(--hover-bg);
    border-color: var(--accent-color);
    color: var(--text-primary);
    transform: translateY(-1px);
  }

  .example-icon {
    font-size: 13px;
  }

  .file-uploader-container {
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
      <div className="welcome-container">
        <div className="welcome-logo">
          <img src={banner} alt="HippoxOS Banner" />
        </div>
        <ArtText
          text={"HippoxOS"}
          fontSize={52}
          fontWeight="300"
          letterSpacing={4}
          textColor="#818cf8"
          lightColor="#ffffff"
          animationDuration={3}
          glowSize={2}
        />
        <p className="welcome-subtitle">
          {t("welcome.subtitle") || "A native LLM operating system"}
        </p>
        <form className="welcome-form" onSubmit={handleSubmit}>
          <div
            className={`welcome-input-container ${isFocused ? "focused" : ""}`}
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
                <div
                  className="icon-btn folder-btn"
                  ref={workflowBtnRef}
                  onClick={() => setShowWorkflowMenu(!showWorkflowMenu)}
                  title={t("chat.selectWorkflowMode") || "Workflow Mode"}
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
                    {selectedWorkflowMode}
                  </span>
                  <ChevronRightIcon size={10} className="chevron" />
                </div>
                {showAttachmentMenu && (
                  <div className="attachment-menu" ref={attachmentMenuRef}>
                    <div
                      className="attachment-item"
                      onClick={() => handleAttachment("text")}
                    >
                      📄 {t("chat.textFile") || "TextFile"}
                    </div>
                    <div
                      className="attachment-item"
                      onClick={() => handleAttachment("image")}
                    >
                      🖼️ {t("chat.image") || "Image"}
                    </div>
                    <div
                      className="attachment-item"
                      onClick={() => handleAttachment("video")}
                    >
                      🎬 {t("chat.video") || "Video"}
                    </div>
                    <div
                      className="attachment-item"
                      onClick={() => handleAttachment("skill")}
                    >
                      📁 {t("chat.skillFile") || "Skill File"}
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
                          <FolderOpenIcon
                            size={16}
                            className="my-folder-icon"
                          />
                        ) : (
                          <FolderIcon size={16} className="my-folder-icon" />
                        )}
                        <div className="directory-item-content">
                          <div style={{ textAlign: "left" }}>
                            {workspace.name}
                          </div>
                          <div
                            className="workspace-path"
                            title={workspace.workspace_path}
                            style={{ textAlign: "left" }}
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
                          <div style={{ textAlign: "left" }}>{mode}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className={`send-icon-btn ${inputValue.trim() || uploadedFiles.length > 0 ? "active" : ""}`}
                type="submit"
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
        </form>
        <div className="examples-section">
          <div className="examples-title">
            {t("welcome.examples") || "Try these"}
          </div>
          <div className="examples-grid">
            {currentPrompts.slice(0, 15).map((prompt, index) => {
              const randomWidths = [
                150, 170, 190, 210, 160, 180, 200, 220, 155, 175, 195, 215, 165,
                185, 205, 225,
              ];
              const width = randomWidths[index % randomWidths.length];
              return (
                <div
                  key={index}
                  className="example-chip"
                  style={{ width: `${width}px` }}
                  onClick={() => handleExampleClick(prompt)}
                  onMouseEnter={(e) => {
                    const span =
                      e.currentTarget.querySelector("span:last-child");
                    if (span && span.scrollWidth > span.clientWidth) {
                      showTooltipOnElement(e.currentTarget, prompt);
                    }
                  }}
                  onMouseLeave={() => {
                    const container = document.getElementById(
                      "global-tooltip-container",
                    );
                    if (container) container.remove();
                  }}
                >
                  <span className="example-icon">💡</span>
                  <span>
                    {prompt.length > 25 ? prompt.slice(0, 25) + "..." : prompt}
                  </span>
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
