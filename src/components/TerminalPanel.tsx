import React, { useRef, useEffect, useState } from 'react';
import { ExecutionLog } from '../type';

interface TerminalPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string, params?: any) => string;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ logs, onClearLogs, t }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkScrollPosition = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setIsAtBottom(atBottom);
    setShowScrollButton(scrollHeight > clientHeight && !atBottom);
  };

  useEffect(() => {
    const element = terminalRef.current;
    if (element) {
      element.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => element.removeEventListener('scroll', checkScrollPosition);
    }
  }, [logs]);

  useEffect(() => {
    if (terminalRef.current && isAtBottom) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
    checkScrollPosition();
  }, [logs, isAtBottom]);

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'process': return '⚙️';
      default: return '📌';
    }
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'success': return 'log-success';
      case 'error': return 'log-error';
      case 'process': return 'log-process';
      default: return 'log-info';
    }
  };

  return (
    <div className="terminal-panel">
      <div className="panel-header">
        <div className="header-title">
          <span className="title-icon">🖥️</span>
          <span>{t('terminal.title')}</span>
          <span className="log-count">{logs.length}</span>
        </div>
        <button className="clear-logs-btn" onClick={onClearLogs} title={t('terminal.clear')}>
          🧹
        </button>
      </div>

      <div className="terminal-content-wrapper">
        <div className="terminal-content" ref={terminalRef}>
          {logs.length === 0 ? (
            <div className="empty-terminal">{t('terminal.empty')}</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={`log-entry ${getLevelClass(log.level)}`}>
                <span className="log-time">[{log.timestamp}]</span>
                <span className="log-icon">{getLevelIcon(log.level)}</span>
                <div className="log-message">
                  <span className="log-text">{log.message}</span>
                  {log.details && <span className="log-details">{log.details}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {showScrollButton && (
          <div className="scroll-buttons terminal-scroll-buttons">
            <button className="scroll-btn" onClick={scrollToBottom} title={t('terminal.scrollToBottom')}>
              ↓
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalPanel;