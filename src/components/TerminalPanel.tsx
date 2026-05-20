import React, { useRef, useEffect, useState } from 'react';
import { ExecutionLog } from '../type';
import { ClearIcon } from '../icons';

interface TerminalPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string, params?: any) => string;
}

const terminalStyles = `
  .terminal-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .terminal-content-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-height: 0;
  }

  .terminal-content {
    height: 100%;
    overflow-y: auto;
    padding: 16px;
    padding-bottom: 60px;
    font-family: "Fira Code", "Courier New", monospace;
    font-size: 13px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    flex-shrink: 0;
    min-height: 47px;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .log-count {
    font-size: 11px;
    background: var(--bg-tertiary);
    padding: 2px 8px;
    border-radius: 12px;
    color: var(--text-secondary);
  }

  .clear-logs-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
    color: var(--text-primary);
    padding: 4px 8px;
    border-radius: 6px;
  }

  .clear-logs-btn:hover {
    opacity: 1;
    background: var(--hover-bg);
  }

  .log-entry {
    display: flex;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);
    align-items: flex-start;
  }

  .log-time {
    color: var(--text-muted);
    font-size: 11px;
    flex-shrink: 0;
    font-family: monospace;
  }

  .log-icon {
    font-size: 14px;
    min-width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  .log-message {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .log-line {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  .log-text {
    font-weight: 500;
    word-break: break-word;
  }

  .log-duration {
    font-size: 10px;
    color: var(--text-muted);
    font-family: monospace;
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: auto;
  }

  .log-details {
    font-size: 11px;
    color: var(--text-muted);
    word-break: break-word;
    border-left: 2px solid var(--border-color);
    margin-top: 4px;
    padding-top: 4px;
    padding-left: 8px;
  }

  .log-entry.log-process .log-details {
    border-left-color: var(--accent-yellow);
  }

  .log-entry.log-success .log-details {
    border-left-color: var(--accent-green);
  }

  .log-entry.log-error .log-details {
    border-left-color: var(--accent-red);
  }

  .log-success .log-text {
    color: var(--text-primary);
  }

  .log-process .log-text {
    color: var(--text-secondary);
  }

  .log-error .log-text {
    color: var(--text-primary);
    opacity: 0.8;
  }

  .empty-terminal {
    text-align: center;
    color: var(--text-muted);
    padding: 40px;
  }

  .scroll-buttons {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: 100;
  }

  .terminal-scroll-buttons {
    bottom: 16px;
  }

  .scroll-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .scroll-btn:hover {
    background: var(--bg-tertiary);
    border-color: var(--text-secondary);
  }
`;

if (typeof document !== 'undefined') {
  const styleId = 'terminal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = terminalStyles;
    document.head.appendChild(style);
  }
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

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getLogIcon = (log: ExecutionLog) => {
    const level = log.level;
    const message = log.message.toLowerCase();
    if (message.includes('决策') || message.includes('deciding')) return '🧠';
    if (message.includes('意图') || message.includes('intent')) return '🎯';
    if (message.includes('策略') || message.includes('strategy')) return '💡';
    if (message.includes('并行') || message.includes('parallel')) return '⚡';
    if (message.includes('调用') || message.includes('invoke') || message.includes('skill')) return '🔧';
    if (message.includes('执行') || message.includes('execute')) return '⚙️';
    if (message.includes('文件') || message.includes('file')) return '📄';
    if (message.includes('读取') || message.includes('read')) return '📖';
    if (message.includes('写入') || message.includes('write')) return '💾';
    if (message.includes('删除') || message.includes('delete')) return '🗑️';
    if (message.includes('目录') || message.includes('directory')) return '📁';
    if (message.includes('http') || message.includes('请求')) return '🌐';
    if (message.includes('响应') || message.includes('response')) return '📡';
    if (message.includes('ping') || message.includes('dns')) return '🔌';
    if (message.includes('计算') || message.includes('统计')) return '📊';
    if (message.includes('分析') || message.includes('analyze')) return '📈';
    if (message.includes('成功') || message.includes('success')) return '✅';
    if (message.includes('完成') || message.includes('complete')) return '✔️';
    if (message.includes('失败') || message.includes('fail')) return '❌';
    if (message.includes('警告') || message.includes('warn')) return '⚠️';
    if (message.includes('重试') || message.includes('retry')) return '🔄';
    if (message.includes('开始') || message.includes('start')) return '🚀';
    if (message.includes('初始化') || message.includes('init')) return '🔌';
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

  const formatLogMessage = (log: ExecutionLog) => {
    let mainMessage = log.message;
    let extraDetails = log.details;
    if (mainMessage.includes('调用技能') && extraDetails) {
      const skillMatch = extraDetails.match(/(\w+)/);
      if (skillMatch) {
        mainMessage = `🔧 ${skillMatch[1]}`;
      }
    }
    return { mainMessage, extraDetails };
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
          <ClearIcon size={14} />
        </button>
      </div>

      <div className="terminal-content-wrapper">
        <div className="terminal-content" ref={terminalRef}>
          {logs.length === 0 ? (
            <div className="empty-terminal">{t('terminal.empty')}</div>
          ) : (
            logs.map((log) => {
              const { mainMessage, extraDetails } = formatLogMessage(log);
              return (
                <div key={log.id} className={`log-entry ${getLevelClass(log.level)}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-icon">{getLogIcon(log)}</span>
                  <div className="log-message">
                    <div className="log-line">
                      <span className="log-text">{mainMessage}</span>
                      {log.duration && (
                        <span className="log-duration">{formatDuration(log.duration)}</span>
                      )}
                    </div>
                    {extraDetails && (
                      <div className="log-details">{extraDetails}</div>
                    )}
                  </div>
                </div>
              );
            })
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