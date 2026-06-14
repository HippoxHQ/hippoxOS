export const scheduledTasksStyles = `
  :root {
    --bg-primary: #0f1117;
    --bg-secondary: #1a1d26;
    --bg-tertiary: #22252f;
    --border-color: #2d303a;
    --text-primary: #e8edf2;
    --text-secondary: #9ca3af;
    --text-muted: #6b7280;
    --accent-color: #818cf8;
    --accent-glow: rgba(129, 140, 248, 0.15);
    --hover-bg: rgba(232, 237, 242, 0.08);
    --scrollbar-thumb: #3a3f4a;
  }

  [data-theme="light"] {
    --bg-primary: #f3f4f6;
    --bg-secondary: #ffffff;
    --bg-tertiary: #e5e7eb;
    --border-color: #d1d5db;
    --text-primary: #111827;
    --text-secondary: #4b5563;
    --text-muted: #9ca3af;
    --accent-color: #6366f1;
    --accent-glow: rgba(99, 102, 241, 0.1);
    --hover-bg: rgba(0, 0, 0, 0.04);
    --scrollbar-thumb: #cbd5e1;
  }

  .scheduled-tasks-container {
    flex: 1;
    display: flex;
    height: 100%;
    background: var(--bg-primary);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .scheduled-left-panel {
    flex-shrink: 0;
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .resize-handle-scheduled {
    width: 4px;
    background: var(--border-color);
    cursor: col-resize;
    transition: all 0.2s;
    position: relative;
    flex-shrink: 0;
  }

  .resize-handle-scheduled:hover {
    background: var(--scrollbar-thumb);
    opacity: 0.6;
  }

  .resize-handle-scheduled .handle-line {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 40px;
    background: var(--text-muted);
    border-radius: 2px;
    transition: background 0.2s;
  }

  .resize-handle-scheduled:hover .handle-line {
    background: var(--text-secondary);
  }

  .scheduled-center-wrapper {
    flex: 1;
    min-width: 300px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .scheduled-right-panel {
    flex-shrink: 0;
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .scheduled-tasks-layout {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .scheduled-tasks-main {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }

  .bottom-heatmap-panel {
    flex-shrink: 0;
    height: 188px;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 12px 16px;
  }

  .bottom-heatmap-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .bottom-heatmap-icon {
    font-size: 14px;
  }

  .bottom-heatmap-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .bottom-heatmap-wrapper {
    flex: 1;
    min-height: 120px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .bottom-heatmap-legend {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
    flex-shrink: 0;
  }

  .bottom-heatmap-legend .legend-label {
    font-size: 9px;
    color: var(--text-muted);
  }

  .bottom-heatmap-wrapper .react-calendar-heatmap rect {
    rx: 3;
    ry: 3;
  }

  .bottom-heatmap-wrapper .react-calendar-heatmap-weekday-labels text {
    font-size: 9px;
    fill: var(--text-muted);
  }

  .bottom-heatmap-wrapper .react-calendar-heatmap-month-labels text {
    font-size: 9px;
    fill: var(--text-secondary);
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: var(--text-secondary);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
  }

  .loading-spinner-svg {
    width: 32px;
    height: 32px;
    animation: spin 0.8s linear infinite;
    color: var(--accent-color);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;