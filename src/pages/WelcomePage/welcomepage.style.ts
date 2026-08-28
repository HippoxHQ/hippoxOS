export const welcomepageStyles = `
  .my-folder-icon {
  }
  .welcome-page {
    user-select: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    width: 100%;
    background: var(--bg-primary);
  }
  .welcome-container {
    max-width: 830px;
    width: 85%;
    text-align: center;
    padding: 40px 20px;
  }
  .welcome-logo {
    margin: 0 auto 20px auto;
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
    height: 170px;
    border-radius: 5px;
  }
  .welcome-logo img {
    height: 170px;
    border-radius: 5px;
  }
  .welcome-title {
    font-size: 32px;
    font-weight: 600;
    background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-color, #818cf8) 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 5px;
  }
  .welcome-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 20px 0px;
  }
  .welcome-form {
    width: 80%;
    min-width: 325px;
    margin-bottom: 20px;
    margin: 0 auto 10px auto;
  }
  .welcome-input-container {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    cursor: text;
  }
  .welcome-input-container.focused {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }
  .input-textarea-wrapper {
    padding: 12px 12px 8px 12px;
    flex: 1;
  }
  .welcome-textarea {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    outline: none;
    font-family: inherit;
    min-height: 60px;
    padding: 0;
  }
  .welcome-textarea::placeholder {
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
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
  .attachment-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px 0;
    min-width: 120px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }
  .attachment-item {
    padding: 8px 12px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 12px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .attachment-item:hover {
    background: var(--hover-bg);
  }
  .directory-menu {
    position: absolute;
    bottom: 100%;
    left: 35px;
    margin-bottom: 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px 0;
    min-width: 160px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }
  .directory-item {
    padding: 8px 12px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .directory-item:hover {
    background: var(--hover-bg);
  }
  .directory-item.selected {
    background: var(--accent-color);
    color: white;
  }
  .workspace-path {
    font-size: 10px;
    color: var(--text-tertiary);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }
  .selected .workspace-path {
    color: rgba(255, 255, 255, 0.7);
  }
  .directory-item-content {
    flex: 1;
    min-width: 0;
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
  .examples-section {
    margin-top: 8px;
  }
  .examples-title {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }
  .examples-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    max-width: 800px;
    margin: 0 auto;
  }
  .example-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    cursor: pointer;
    font-size: 10px;
    color: var(--text-secondary);
    width: auto;
    white-space: nowrap;
  }
  .example-chip span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100px;
  }
  .example-chip:hover {
    background: var(--hover-bg);
    border-color: var(--accent-color);
    color: var(--text-primary);
    transform: translateY(-1px);
  }
  .example-icon {
    font-size: 10px;
  }
  .example-chip span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 140px;
  }
  .file-uploader-container {
  }
  .domain-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 0 auto 10px auto;
    width: 80%;
  }
  .domain-card {
    position: relative;
    padding: 10px 10px;
    border-radius: 5px;
    cursor: pointer;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    transition: all 0.2s ease;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    white-space: nowrap;
  }
  .domain-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent-color);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
  .domain-card .card-bg-emoji {
    position: absolute;
    right: -8px;
    top: 50%;
    transform: translateY(-50%) rotate(15deg);
    font-size: 56px;
    opacity: 0.15;
    filter: blur(1px);
    transition: opacity 0.3s ease;
    pointer-events: none;
    line-height: 1;
  }
  .domain-card:hover .card-bg-emoji {
    opacity: 0.1;
  }
  .domain-card .card-left {
    position: relative;
    z-index: 1;
    flex: 1;
    text-align: left;
    min-width: 0;
    overflow: hidden;
  }
  .domain-card .domain-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .domain-card .domain-desc {
    font-size: 11px;
    color: var(--text-tertiary);
    line-height: 1.2;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .domain-card .domain-arrow {
    position: relative;
    z-index: 1;
    font-size: 14px;
    color: var(--text-tertiary);
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-left: 8px;
    opacity: 0;
  }
  .domain-card:hover .domain-arrow {
    opacity: 1;
    color: var(--accent-color);
    transform: translateX(3px);
  }
  @media (max-width: 640px) {
    .domain-cards {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .domain-card {
      padding: 12px 14px;
      min-height: 52px;
    }
    .domain-card .card-bg-emoji {
      font-size: 40px;
    }
    .domain-card .domain-name {
      font-size: 12px;
    }
    .domain-card .domain-desc {
      font-size: 10px;
    }
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
`;