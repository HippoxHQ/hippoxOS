export const mainPanelStyles = `
  .function-resize-handle {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    height: 1px;
    background: var(--border-color);
    cursor: row-resize;
  }
  .function-resize-handle::after {
    content: '';
    position: absolute;
    top: -10px;
    left: 0;
    right: 0;
    bottom: -10px;
    cursor: row-resize;
    z-index: 10;
  }
  .editor-resize-handle {
    position: relative;
    z-index: 1;
  }
  .editor-resize-handle::after {
    content: '';
    position: absolute;
    top: 0;
    left: -10px;
    right: -10px;
    bottom: 0;
    cursor: col-resize;
    z-index: 10;
  }
  .market-resize-handle {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .market-resize-handle::after {
    content: '';
    position: absolute;
    top: 0;
    left: -8px;
    right: -8px;
    bottom: 0;
    cursor: col-resize;
    z-index: 10;
  }
  .market-resize-handle .handle-line {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 30px;
    background: var(--text-muted);
    border-radius: 2px;
    transition: background 0.2s;
  }
  .market-resize-handle:hover .handle-line {
    background: var(--text-secondary);
  }
  textarea::-webkit-scrollbar,
  div::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  textarea::-webkit-scrollbar-track,
  div::-webkit-scrollbar-track {
    background: transparent;
  }
  textarea::-webkit-scrollbar-thumb,
  div::-webkit-scrollbar-thumb {
    background: rgba(75, 85, 99, 0.5);
    border-radius: 2px;
  }
  textarea::-webkit-scrollbar-thumb:hover,
  div::-webkit-scrollbar-thumb:hover {
    background: rgba(75, 85, 99, 0.7);
  }
  textarea::-webkit-scrollbar-corner,
  div::-webkit-scrollbar-corner {
    background: transparent;
  }
  .function-area {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
    width: 100%;
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .function-area.collapsed {
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    overflow: hidden;
    padding: 0;
    margin: 0;
    border: none;
  }
  .dsl-content-wrapper {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: row;
    width: 100%;
  }
  .function-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-secondary, #1e1e2e);
    flex-shrink: 0;
    height: 30px;
    min-height: 30px;
    max-height: 30px;
    gap: 2px;
    overflow: hidden;
    position: relative;
    z-index: 5;
  }
  .function-bar-left {
    display: flex;
    align-items: center;
    gap: 2px;
    overflow: hidden;
    flex: 1;
  }
  .function-bar-right {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    min-width: 22px;
  }
  .function-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 11px;
    transition: all 0.15s ease;
    white-space: nowrap;
    height: 22px;
  }
  .function-button:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
    border-color: var(--border-color);
  }
  .function-button.active {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--accent-color);
  }
  .function-divider {
    width: 1px;
    height: 16px;
    background: var(--border-color);
    flex-shrink: 0;
  }
  .function-collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
    flex-shrink: 0;
  }
  .function-collapse-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
    border-color: var(--border-color);
  }
  .chart-container {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    transition: flex 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (max-width: 600px) {
    .function-button {
      padding: 3px 6px;
      font-size: 10px;
    }
    .function-button .label-text {
      display: none;
    }
    .function-divider {
      display: none;
    }
  }
`;