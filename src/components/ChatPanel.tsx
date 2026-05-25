import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../type";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void | Promise<void>;
  t: (key: string, params?: any) => string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  t,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
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

        .chat-input-area-hermes {
          padding: 16px 20px 20px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .input-wrapper-hermes {
          position: relative;
          display: flex;
          align-items: flex-end;
          background: var(--bg-tertiary);
          border-radius: 24px;
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }

        .input-wrapper-hermes.focused {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .chat-textarea-hermes {
          flex: 1;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 14px;
          line-height: 1.5;
          resize: none;
          outline: none;
          font-family: inherit;
          max-height: 120px;
        }
        .chat-textarea-hermes::placeholder {
          color: var(--text-tertiary);
        }
        .send-btn-hermes {
          margin: 8px 12px 8px 0;
          width: 32px;
          height: 32px;
          border-radius: 16px;
          background: var(--bg-secondary);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
          transition: all 0.2s ease;
        }
        .send-btn-hermes.active {
          background: var(--accent-color);
          color: white;
        }
        .send-btn-hermes.active:hover {
          transform: scale(1.05);
          background: var(--accent-hover);
        }
        .send-btn-hermes:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .input-hint-hermes {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .scroll-buttons {
          position: absolute;
          bottom: 20px;
          right: 20px;
        }
        .scroll-btn {
          width: 36px;
          height: 36px;
          border-radius: 18px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
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
          --bg-primary: #ffffff;
          --bg-secondary: #f5f5f5;
          --bg-tertiary: #ffffff;
          --border-color: #e5e5e5;
          --text-primary: #1a1a1a;
          --text-secondary: #666666;
          --text-tertiary: #999999;
          --accent-color: #6366f1;
          --accent-hover: #4f46e5;
          --accent-glow: rgba(99, 102, 241, 0.2);
        }
        [data-theme="dark"] {
          --bg-primary: #0d0d0d;
          --bg-secondary: #1a1a1a;
          --bg-tertiary: #2d2d2d;
          --border-color: #3d3d3d;
          --text-primary: #e5e5e5;
          --text-secondary: #a0a0a0;
          --text-tertiary: #6b6b6b;
          --accent-color: #818cf8;
          --accent-hover: #6366f1;
          --accent-glow: rgba(129, 140, 248, 0.2);
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
      <div className="chat-input-area-hermes">
        <div className={`input-wrapper-hermes ${isFocused ? "focused" : ""}`}>
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
          <button
            className={`send-btn-hermes ${inputValue.trim() ? "active" : ""}`}
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
