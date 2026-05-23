import React, { useRef, useEffect, useState } from 'react';
import { hippoxCommands } from '../api/chat';
import { ExecutionLog, TaskInfo } from '../type';

interface TerminalPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string) => string;
  activeTasks?: TaskInfo[];
}

const logToConsole = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString();
  switch (level) {
    case 'error':
      console.error(`[${timestamp}] ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`[${timestamp}] ${message}`, data || '');
      break;
    case 'info':
      console.info(`[${timestamp}] ${message}`, data || '');
      break;
    default:
      console.log(`[${timestamp}] ${message}`, data || '');
  }
};

const TerminalPanel: React.FC<TerminalPanelProps> = ({ logs, onClearLogs, t, activeTasks = [] }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  useEffect(() => {
    const newExpanded = new Set(expandedTasks);
    activeTasks.forEach(task => {
      if (!expandedTasks.has(task.task_id)) {
        newExpanded.add(task.task_id);
      }
    });
    setExpandedTasks(newExpanded);
  }, [activeTasks]);
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeTasks, autoScroll]);
  const handleScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setAutoScroll(isAtBottom);
  };
  const handleClearLogs = async () => {
    await hippoxCommands.clearLogs();
    onClearLogs();
    logToConsole('info', 'Terminal logs cleared');
  };
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };
  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      case 'pending': return '⏳';
      default: return '📌';
    }
  };
  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '✅';
      case 'FAILURE': return '❌';
      case 'RUNNING': return '🔄';
      default: return '⏳';
    }
  };
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString();
    } catch {
      return '';
    }
  };
  const renderTaskRow = (task: TaskInfo) => {
    const isExpanded = expandedTasks.has(task.task_id);
    const successCount = task.steps.filter(s => s.status === 'SUCCESS').length;
    const failureCount = task.steps.filter(s => s.status === 'FAILURE').length;
    const runningCount = task.steps.filter(s => s.status === 'RUNNING').length;
    let stepSummary = '';
    if (task.steps.length > 0) {
      const parts = [];
      if (successCount > 0) parts.push(`✓${successCount}`);
      if (failureCount > 0) parts.push(`✗${failureCount}`);
      if (runningCount > 0) parts.push(`⟳${runningCount}`);
      stepSummary = ` [${parts.join(' ')}]`;
    }

    return (
      <div key={task.task_id} className="task-row">
        <div className="task-row-header" onClick={() => toggleTaskExpand(task.task_id)}>
          <span className="task-expand-icon">{isExpanded ? '▼' : '▶'}</span>
          <span className="task-status-icon">{getTaskStatusIcon(task.status)}</span>
          <span className="task-time">[{formatTime(task.created_at)}]</span>
          <span className="task-input">📤 {task.user_input}</span>
          <span className="task-status-text">{task.status}{stepSummary}</span>
        </div>

        {isExpanded && task.steps.length > 0 && (
          <div className="task-steps">
            {task.steps.map((step) => (
              <div key={`${task.task_id}-step-${step.step_index}`} className="task-step">
                <span className="step-indent">  </span>
                <span className="step-icon">{getStepStatusIcon(step.status)}</span>
                <span className="step-name">🔧 {step.step_name}</span>
                <span className={`step-status step-status-${step.status.toLowerCase()}`}>
                  {step.status}
                </span>
                {step.output && (
                  <div className="step-output">
                    <span className="step-indent">    </span>
                    <span className="output-text">{step.output}</span>
                  </div>
                )}
                {step.error && (
                  <div className="step-error">
                    <span className="step-indent">    </span>
                    <span className="error-text">❌ {step.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isExpanded && task.final_output && task.status === 'completed' && (
          <div className="task-final-output">
            <span className="step-indent">  </span>
            <span className="output-label">📝 Response:</span>
            <div className="output-content">{task.final_output}</div>
          </div>
        )}
        {isExpanded && task.status === 'failed' && task.final_output && (
          <div className="task-error">
            <span className="step-indent">  </span>
            <span className="error-label">❌ Error:</span>
            <div className="error-content">{task.final_output}</div>
          </div>
        )}
        <div className="task-separator"></div>
      </div>
    );
  };

  return (
    <div className="terminal-panel">
      <div className="panel-header">
        <div className="header-title">
          <span className="title-icon">🖥️</span>
          <span>{t('terminal.title')}</span>
          <span className="task-count">
            {activeTasks.filter(t => t.status === 'running').length > 0 &&
              ` (${activeTasks.filter(t => t.status === 'running').length} running)`
            }
          </span>
        </div>
        <button className="clear-logs-btn" onClick={handleClearLogs} title={t('terminal.clear')}>
          🗑️
        </button>
      </div>

      <div className="terminal-content-wrapper">
        <div className="terminal-content" ref={terminalRef} onScroll={handleScroll}>
          {activeTasks.length === 0 ? (
            <div className="empty-terminal">{t('terminal.empty')}</div>
          ) : (
            activeTasks.map(task => renderTaskRow(task))
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalPanel;