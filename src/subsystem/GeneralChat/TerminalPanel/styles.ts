export const globalStyles = `
.task-resume-btn {
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #4caf50;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  // transition: all 0.2s ease;
  width: 24px;
  height: 24px;
}
.task-resume-btn:hover {
  background: rgba(76, 175, 80, 0.3);
  transform: scale(1.05);
}
.task-pause-btn {
  background: rgba(255, 165, 0, 0.15);
  border: 1px solid rgba(255, 165, 0, 0.3);
  color: #ffa500;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  // transition: all 0.2s ease;
  width: 24px;
  height: 24px;
}
.task-pause-btn:hover {
  background: rgba(255, 165, 0, 0.3);
  transform: scale(1.05);
}
.step-status-paused {
    background: rgba(255, 165, 0, 0.15);
    color: #ffa500;
    border: 1px solid rgba(255, 165, 0, 0.3);
}
.task-status-right {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.task-interrupt-btn {
  background: rgba(255, 68, 68, 0.15);
  border: 1px solid rgba(255, 68, 68, 0.3);
  color: #ff4444;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  // transition: all 0.2s ease;
  width: 24px;
  height: 24px;
}
.task-interrupt-btn:hover {
  background: rgba(255, 68, 68, 0.3);
  transform: scale(1.05);
}
.task-step {
  padding: 4px 0;
}
.step-main-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-left: 20px;
}
.step-icon {
  flex-shrink: 0;
  font-size: 12px;
}
.step-name {
  font-size: 12px;
  color: var(--text-primary);
  font-family: monospace;
  font-weight: 500;
}
.step-duration {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: monospace;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
}
.step-status-spacer {
  flex: 1;
}
.step-status {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  font-weight: 500;
}
.step-status-success {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.step-status-failure {
  background: rgba(255, 68, 68, 0.15);
  color: #ff4444;
  border: 1px solid rgba(255, 68, 68, 0.3);
}
.step-status-running {
  background: rgba(255, 165, 0, 0.15);
  color: #ffa500;
  border: 1px solid rgba(255, 165, 0, 0.3);
  animation: pulse 1.5s ease-in-out infinite;
}
.step-status-waiting {
  background: rgba(128, 128, 128, 0.15);
  color: #888;
  border: 1px solid rgba(128, 128, 128, 0.3);
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.step-status-timeout {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}
.step-parameters-row {
  margin-top: 0px;
  margin-left: 10px;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  border-left: 2px solid var(--accent-color, #00aaff);
  width: calc(100% - 10px);
  box-sizing: border-box;
}
.step-parameters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.step-parameters-label {
  color: var(--text-primary);
  flex-shrink: 0;
  font-weight: 500;
}
.step-parameters-toggle {
  background: transparent;
  border: 1px solid var(--border-color, #444);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  // transition: all 0.2s;
}
.step-parameters-toggle:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
  border-color: var(--accent-color);
}
.step-parameters-short {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-family: monospace;
  color: var(--text-primary);
  margin-top: 2px;
}
.step-parameters-code {
  margin: 4px 0 0 0;
  padding: 8px;
  background: var(--bg-secondary, #1a1a1a);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'Courier New', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color, #333);
}
.step-parameters-value {
  color: var(--text-primary);
  word-break: break-all;
  white-space: normal;
  line-height: 1.4;
  font-family: monospace;
}
.step-parameters-more {
  color: var(--text-tertiary);
  font-style: italic;
  font-size: 10px;
}
.task-total-duration {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: monospace;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
}
.task-files-scroll-container {
  margin: 8px 0 4px 24px;
}
.task-files-scroll-wrapper {
  border-radius: 8px;
}
.task-files-list-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  // background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 0 4px;
}
.task-files-scroll-btn {
  flex-shrink: 0;
  width: 28px;
  height: 60px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  // transition: all 0.2s ease;
  opacity: 0.8;
}
.task-files-scroll-btn:hover {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
  opacity: 1;
}
.task-files-scroll {
  flex: 1;
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  overflow-x: auto;
  padding: 8px 4px;
  scrollbar-width: none; 
  -ms-overflow-style: none; 
  scroll-behavior: smooth;
}
.task-files-scroll::-webkit-scrollbar {
  height: 4px;
}
.task-files-scroll::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 2px;
}
.task-files-scroll::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}
.task-files-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
.task-file-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  min-width: 140px;
  max-width: 180px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  // transition: all 0.2s ease;
  flex-shrink: 0;
}
.task-file-chip:hover {
  background: var(--hover-bg);
  border-color: var(--accent-color);
  transform: translateY(-1px);
}
.task-file-preview-img {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
}
.task-file-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: var(--bg-secondary);
  border-radius: 4px;
}
.task-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.task-file-name {
  font-size: 11px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-file-size {
  font-size: 9px;
  color: var(--text-tertiary);
}
.ascii-art {
  margin: 0px 0px;
}
.ascii-pre {
  font-family: 'Courier New', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.2;
  color: var(--terminal-text, #119c11);
  margin: 0;
  padding: 4px 0;
  white-space: pre;
  background: transparent;
  border: none;
  text-shadow: 0 0 2px rgba(0, 255, 0, 0.3);
}
.welcome-row-header {
  cursor: pointer;
}
.welcome-step-name {
  color: var(--terminal-dim, #888);
}
.scroll-buttons-container {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}
.scroll-button {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: var(--bg-tertiary, #2d2d2d);
  border: 1px solid var(--border-color, #444);
  color: var(--text-secondary, #aaa);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  // transition: all 0.2s;
  backdrop-filter: blur(4px);
}
.task-list-button {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--bg-tertiary, #2d2d2d);
  border: 1px solid var(--border-color, #444);
  color: var(--text-secondary, #aaa);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  // transition: all 0.2s;
  flex-shrink: 0;
}
.bubble-container {
  position: absolute;
  right: 0px;
  top: 40px;
  min-width: 300px;
  max-width: 360px;
  max-height: 600px;
  background: var(--bg-secondary, #1e1e1e);
  border: 1px solid var(--border-color, #333);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  overflow: hidden;
  z-index: 100;
  pointer-events: auto;
}
.bubble-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color, #333);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #aaa);
  background: var(--bg-tertiary, #252525);
}
.bubble-content {
  max-height: 340px;
  overflow-y: auto;
  padding: 8px 0;
}
.bubble-item {
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  // transition: all 0.15s;
  border-left: 2px solid transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}
.bubble-item-active {
  background: var(--hover-bg, #2a2a2a);
  border-left-color: var(--accent-color, #00aaff);
}
.bubble-item-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.bubble-item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #fff);
}
.bubble-item-status {
  font-size: 10px;
  color: var(--text-tertiary, #888);
  flex-shrink: 0;
}
.panel-header {
  padding-top: 8px;
  padding-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color, #333);
  user-select: none;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title-icon {
  font-size: 14px;
}
.task-count {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: 4px;
}
.clear-logs-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  // transition: all 0.2s;
}
.clear-logs-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}
.output-content-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 8px;
}
.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.output-label {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 11px;
}
.copy-output-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  // transition: all 0.2s;
}
.copy-output-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}
.error-content-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
  color: #ff6666;
  background: rgba(255, 68, 68, 0.1);
  padding: 8px 12px;
  border-radius: 5px;
  margin-top: 5px;
}
.error-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.error-label {
  color: #ff6666;
  font-weight: 500;
  font-size: 11px;
}
.copy-error-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  // transition: all 0.2s;
}
.copy-error-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}
.output-content-func {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
.task-separator {
  padding: 8px 0px;
  // margin: 8px 0;
  // border-top: 1px solid var(--border-color, #333);
}
.terminal-content-wrapper {
  position: relative;
  flex: 1;
  overflow: visible;
  min-height: 0;
  width: 100%;
}
.terminal-content {
  height: 100%;
  overflow-y: auto;
  // padding-left: 10px;
  // padding-right: 10px;
}
.task-row {
  // margin-bottom: 2px;
  padding-bottom: 2px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 13px;
  padding: 0px 10px;
}
.task-row-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 5px 0;  
  border-radius: 5px;
  // transition: background 0.2s;
  font-size: 14px;  
}
.task-time {
  font-size: 13px; 
  color: var(--text-tertiary);
  font-family: monospace;
}
.task-input {
  font-size: 14px;  
  color: var(--text-primary);
  flex: 1;
  font-weight: 500;  
}
.task-status-text {
  font-size: 12px;  
  padding: 2px 10px;  
  border-radius: 4px;
  background: var(--bg-tertiary);
  font-family: monospace;
  font-weight: 500;
}
.task-expand-icon {
  font-size: 12px;  
  color: var(--text-tertiary);
  width: 18px; 
}
.task-status-icon {
  font-size: 14px;  
}
.task-row-header:hover {
  background: var(--hover-bg, rgba(255,255,255,0.05));
}
.task-steps {
  margin-left: 10px;
  margin-top: 4px;
  margin-bottom: 4px;
}
.task-final-output,
.task-error {
  margin-top: 4px;
  padding: 0px 10px;
  background-color: var(--bg-tertiary);
  border-radius: 5px;
  border-left: 3px solid var(--accent-green, #4ec9b0);
  padding-top: 5px;
  padding-bottom: 10px;
}
.task-error {
  border-left-color: var(--accent-red, #f48771);
}
.link {
  color: var(--link-color, #00aaff);
  text-decoration: none;
  cursor: pointer;
  margin-right: 16px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.link:hover {
  text-decoration: underline;
}
.links-container {
  margin-top: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--border-color, #333);
}
.terminal-area-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
`;