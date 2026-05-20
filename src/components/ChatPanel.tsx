import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../type';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  t: (key: string, params?: any) => string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, t }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const checkScrollPosition = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
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
      element.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => element.removeEventListener('scroll', checkScrollPosition);
    }
  }, [messages]);
  useEffect(() => {
    if (!userScrolled && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    checkScrollPosition();
  }, [messages, userScrolled]);
  const handleUserScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
      if (!atBottom) {
        setUserScrolled(true);
      }
    }
    checkScrollPosition();
  };
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
      setUserScrolled(false);
    }
  };
  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      setUserScrolled(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };
  return (
    <div className="chat-panel">
      <div className="panel-header">
        <div className="header-title">
          <span className="title-icon">💬</span>
          <span>{t('chat.title')}</span>
        </div>
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
                {msg.role === 'user' ? '👤' : '🦛'}
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
            <button className="scroll-btn" onClick={scrollToBottom} title={t('chat.scrollToBottom')}>
              ↓
            </button>
          </div>
        )}
      </div>
      <div className="chat-input-area">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={t('chat.placeholder')}
            value={inputValue}
            onChange={adjustTextareaHeight}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            📤 {t('chat.send')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;