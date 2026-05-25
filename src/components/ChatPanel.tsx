import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../type";
import { AttachmentIcon, FolderIcon, SendIcon } from "../icons";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void | Promise<void>;
  t: (key: string, params?: any) => string;
  language?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  t,
  language = "zh",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showDirectoryMenu, setShowDirectoryMenu] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState(
    language === "zh" ? "工作目录" : "Workspace",
  );
  const [directories, setDirectories] = useState<string[]>(
    language === "zh"
      ? [
          "工作目录 1",
          "工作目录 2",
          "工作目录 3",
          "工作目录 4",
          "工作目录 5",
          "工作目录 6",
          "工作目录 7",
          "工作目录 8",
          "工作目录 9",
          "工作目录 10",
          "工作目录 11",
          "工作目录 12",
          "工作目录 13",
          "工作目录 14",
          "工作目录 15",
          "工作目录 16",
        ]
      : [
          "Workspace 1",
          "Workspace 2",
          "Workspace 3",
          "Workspace 4",
          "Workspace 5",
          "Workspace 6",
          "Workspace 7",
          "Workspace 8",
          "Workspace 9",
          "Workspace 10",
          "Workspace 11",
          "Workspace 12",
          "Workspace 13",
          "Workspace 14",
          "Workspace 15",
          "Workspace 16",
        ],
  );
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentBtnRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const directoryBtnRef = useRef<HTMLDivElement>(null);
  const directoryMenuRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);

  const checkScrollPosition = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setIsAtBottom(atBottom);
    setShowScrollButton(scrollHeight > clientHeight && !atBottom);
    if (atBottom) {
      setUserScrolled(false);
    }
  };

  useEffect(() => {
    const element = messagesContainerRef.current;
    if (element) {
      element.addEventListener("scroll", checkScrollPosition);
      checkScrollPosition();
      return () => element.removeEventListener("scroll", checkScrollPosition);
    }
  }, [messages]);

  useEffect(() => {
    if (!userScrolled && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
    checkScrollPosition();
  }, [messages, userScrolled]);

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

  const handleUserScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
      if (!atBottom) {
        setUserScrolled(true);
      }
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

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
      setUserScrolled(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
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

  const handleAttachment = (type: string) => {
    setShowAttachmentMenu(false);
  };

  const handleSelectDirectory = (dir: string) => {
    setSelectedDirectory(dir);
    setShowDirectoryMenu(false);
  };

  return (
    <div className="chat-panel">
      <style>{`
        .chat-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary);
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: baseline;
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
        }

        .message-bubble {
          max-width: 70%;
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

        .chat-input-container {
          margin: 12px 16px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .chat-input-container.focused {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-glow);
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
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .chevron {
          font-size: 8px;
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
          min-width: 140px;
          max-height: 200px;
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
          padding: 6px 12px;
          cursor: pointer;
          color: var(--text-primary);
          font-size: 12px;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .directory-item:hover {
          background: var(--hover-bg);
        }

        .directory-item.selected {
          background: var(--accent-color);
          color: white;
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
      <div className="panel-header">
        <div className="header-title">
          <span className="title-icon">💬</span>
          <span>{t("chat.title")}</span>
        </div>
        <div className="header-subtitle">Claude Sonnet 4.6</div>
      </div>
      <div className="chat-messages-wrapper">
        <div
          className="chat-messages"
          ref={messagesContainerRef}
          onScroll={handleUserScroll}
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === "user" ? "👤" : "🦛"}
              </div>
              <div className="message-bubble">
                <div className="message-content">{msg.content}</div>
                <div className="message-time">{msg.timestamp}</div>
              </div>
            </div>
          ))}
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
      <div className={`chat-input-container ${isFocused ? "focused" : ""}`}>
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
              onClick={() => setShowDirectoryMenu(!showDirectoryMenu)}
              title={t("chat.selectWorkspace")}
            >
              <FolderIcon size={14} />
              <span className="folder-name">{selectedDirectory}</span>
              <span className="chevron">▼</span>
            </div>
            {showAttachmentMenu && (
              <div className="attachment-menu" ref={attachmentMenuRef}>
                <div
                  className="attachment-item"
                  onClick={() => handleAttachment("text")}
                >
                  📄 {t("chat.textFile")}
                </div>
                <div
                  className="attachment-item"
                  onClick={() => handleAttachment("image")}
                >
                  🖼️ {t("chat.image")}
                </div>
                <div
                  className="attachment-item"
                  onClick={() => handleAttachment("video")}
                >
                  🎬 {t("chat.video")}
                </div>
              </div>
            )}
            {showDirectoryMenu && (
              <div className="directory-menu" ref={directoryMenuRef}>
                {directories.map((dir) => (
                  <div
                    key={dir}
                    className={`directory-item ${selectedDirectory === dir ? "selected" : ""}`}
                    onClick={() => handleSelectDirectory(dir)}
                  >
                    📁 {dir}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className={`send-icon-btn ${inputValue.trim() ? "active" : ""}`}
            onClick={handleSend}
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
    </div>
  );
};

export default ChatPanel;
