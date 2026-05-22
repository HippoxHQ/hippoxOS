import React, { useRef, useEffect, useState } from 'react';
import { hippoxCommands } from '../api/chat';
import { ExecutionLog } from '../type';

interface TerminalPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string) => string;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ logs, onClearLogs, t }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setAutoScroll(isAtBottom);
  };

  const getLogIcon = (log: ExecutionLog) => {
    const message = log.message.toLowerCase();
    if (message.includes('初始化')) return '🚀';
    if (message.includes('发送')) return '📤';
    if (message.includes('响应')) return '📥';
    if (message.includes('成功')) return '✅';
    if (message.includes('失败') || message.includes('错误')) return '❌';
    if (message.includes('调用技能')) return '🔧';
    if (message.includes('执行')) return '⚙️';
    switch (log.level) {
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

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const handleClearLogs = async () => {
    await hippoxCommands.clearLogs();
    onClearLogs();
  };

  return (
    <div className="terminal-panel">
      <div className="panel-header">
        <div className="header-title">
          <span className="title-icon">🖥️</span>
          <span>{t('terminal.title')}</span>
          <span className="log-count">{logs.length}</span>
        </div>
        <button className="clear-logs-btn" onClick={handleClearLogs} title={t('terminal.clear')}>
          🗑️
        </button>
      </div>

      <div className="terminal-content-wrapper">
        <div className="terminal-content" ref={terminalRef} onScroll={handleScroll}>
          {logs.length === 0 ? (
            <div className="empty-terminal">{t('terminal.empty')}</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={`log-entry ${getLevelClass(log.level)}`}>
                <span className="log-time">[{log.timestamp}]</span>
                <span className="log-icon">{getLogIcon(log)}</span>
                <div className="log-message">
                  <div className="log-line">
                    <span className="log-text">{log.message}</span>
                    {log.duration && (
                      <span className="log-duration">{formatDuration(log.duration)}</span>
                    )}
                  </div>
                  {log.details && (
                    <div className="log-details">{log.details}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalPanel;