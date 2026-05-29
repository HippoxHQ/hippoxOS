import React, { useState, useRef, useEffect } from "react";
import { AttachmentIcon, FolderIcon, ChevronRightIcon } from "../icons";

interface WelcomePageProps {
  onSendMessage: (message: string) => void;
  t: (key: string) => string;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onSendMessage, t }) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showDirectoryMenu, setShowDirectoryMenu] = useState(false);
  const attachmentBtnRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const directoryBtnRef = useRef<HTMLDivElement>(null);
  const directoryMenuRef = useRef<HTMLDivElement>(null);
  const [showLogo, setShowLogo] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src =
      "https://github.com/HippoxHQ/assets/blob/main/banner/bg.png?raw=true";
    img.onload = () => setShowLogo(true);
    img.onerror = () => setShowLogo(false);
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleExampleClick = (example: string) => {
    onSendMessage(example);
  };

  const handleAttachment = (type: string) => {
    setShowAttachmentMenu(false);
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    setShowDirectoryMenu(false);
  };

  const examples = [
    { text: t("welcome.example.analyze"), icon: "📊" },
    { text: t("welcome.example.code"), icon: "💻" },
    { text: t("welcome.example.search"), icon: "🔍" },
    { text: t("welcome.example.plan"), icon: "📋" },
  ];

  const workspaces = [
    { id: "1", name: "My Workspace", workspace_path: "/home/user/workspace" },
  ];
  const selectedWorkspaceId = "1";

  const getSelectedWorkspaceName = (): string => {
    const workspace = workspaces.find((w) => w.id === selectedWorkspaceId);
    if (!workspace) return t("chat.selectWorkspace") || "Workspace";
    const path = workspace.workspace_path;
    const normalizedPath = path.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    return parts[parts.length - 1] || workspace.name;
  };

  return (
    <div className="welcome-page">
      <style>{`
        .welcome-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          width: 100%;
          background: var(--bg-primary);
        }

        .welcome-container {
          max-width: 700px;
          width: 85%;
          text-align: center;
          padding: 40px 20px;
        }

        .welcome-logo {
          margin: 0 auto 20px auto; 
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
          width: 500px;
          height: 170px;
          border-radius: 5px;
        }

        .welcome-logo img {
          width: 500px;
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
          margin-bottom: 25px;
        }

        .welcome-form {
          width: 100%;
          margin-bottom: 32px;
        }

        .welcome-input-container {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          transition: all 0.2s ease;
          min-height: 120px;
          display: flex;
          flex-direction: column;
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
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .directory-item:hover {
          background: var(--hover-bg);
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
          gap: 8px;
        }

        .example-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          color: var(--text-secondary);
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
          {showLogo && (
            <img
              src="https://github.com/HippoxHQ/assets/blob/main/banner/bg.png?raw=true"
              alt="HippoxOS Banner"
            />
          )}
        </div>
        <h1 className="welcome-title">HippoxOS</h1>
        <p className="welcome-subtitle">
          {t("welcome.subtitle") || "A native LLM operating system"}
        </p>

        <form className="welcome-form" onSubmit={handleSubmit}>
          <div
            className={`welcome-input-container ${isFocused ? "focused" : ""}`}
          >
            <div className="input-textarea-wrapper">
              <textarea
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
                  onClick={() => setShowDirectoryMenu(!showDirectoryMenu)}
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
                      onClick={() => handleAttachment("text")}
                    >
                      📄 {t("chat.textFile") || "文本文件"}
                    </div>
                    <div
                      className="attachment-item"
                      onClick={() => handleAttachment("image")}
                    >
                      🖼️ {t("chat.image") || "图片"}
                    </div>
                    <div
                      className="attachment-item"
                      onClick={() => handleAttachment("video")}
                    >
                      🎬 {t("chat.video") || "视频"}
                    </div>
                    <div
                      className="attachment-item"
                      onClick={() => handleAttachment("skill")}
                    >
                      📁 {t("chat.skillFile") || "Skill文件"}
                    </div>
                  </div>
                )}
                {showDirectoryMenu && (
                  <div className="directory-menu" ref={directoryMenuRef}>
                    {workspaces.map((workspace) => (
                      <div
                        key={workspace.id}
                        className="directory-item"
                        onClick={() => handleSelectWorkspace(workspace.id)}
                      >
                        <FolderIcon size={16} />
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
                className={`send-icon-btn ${inputValue.trim() ? "active" : ""}`}
                type="submit"
                disabled={!inputValue.trim()}
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
            {examples.map((example, index) => (
              <div
                key={index}
                className="example-chip"
                onClick={() => handleExampleClick(example.text)}
              >
                <span className="example-icon">{example.icon}</span>
                <span>{example.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
