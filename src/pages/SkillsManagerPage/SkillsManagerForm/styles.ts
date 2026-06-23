export const formStyles = `
.skill-editor-form {
  flex: 1;
  overflow-y: auto;
  font-size: 13px;
}
.form-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-color), transparent);
}
.form-section {
  background: var(--bg-secondary);
  padding: 14px 16px;
}
.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.form-label.required::after {
  content: " *";
  color: #ef4444;
}
.form-input,
.form-textarea {
  width: 100%;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  box-sizing: border-box;
}
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.form-input.error,
.form-textarea.error {
  border-color: #ef4444;
}
.error-message {
  color: #ef4444;
  font-size: 11px;
  margin-top: 3px;
}
.form-textarea {
  resize: vertical;
  min-height: 56px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
}
.two-column-labels {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
}
.column-label {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}
.two-column-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.tags-container {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  min-height: 34px;
}
.tags-container:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.category-container {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  min-height: 34px;
}
.category-container:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.tag-bubble {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--accent-color);
  color: white;
  font-size: 11px;
  font-weight: 500;
  border-radius: 12px;
}
.tag-remove {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  opacity: 0.7;
}
.tag-remove:hover {
  opacity: 1;
}
.tag-input {
  flex: 1;
  min-width: 60px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 12px;
  padding: 4px 0;
  outline: none;
}
.tag-input::placeholder {
  color: var(--text-tertiary);
  font-size: 11px;
}
.category-input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 12px;
  padding: 4px 0;
  outline: none;
}
.category-input::placeholder {
  color: var(--text-tertiary);
  font-size: 11px;
}
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.step-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}
.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.step-number {
  width: 22px;
  height: 22px;
  background: var(--accent-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.step-input {
  flex: 1;
  min-width: 120px;
  padding: 5px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
}
.step-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.step-actions {
  display: flex;
  gap: 4px;
}
.step-action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 11px;
}
.step-action-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}
.step-action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.dependencies-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
}
.dependencies-title {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dependencies-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dependency-chip {
  padding: 3px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 10px;
  cursor: pointer;
}
.dependency-chip:hover {
  border-color: var(--accent-color);
  background: var(--hover-bg);
}
.dependency-chip.selected {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}
.materials-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
}
.materials-title {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.materials-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.material-item {
  padding: 6px 8px;
  background: var(--bg-primary);
  border-radius: 6px;
}
.material-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.material-type-select {
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-primary);
  cursor: pointer;
}
.material-type-select:hover {
  border-color: var(--accent-color);
}
.material-input {
  flex: 1;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-primary);
}
.material-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.material-remove-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
  color: var(--text-secondary);
  border-radius: 4px;
}
.material-remove-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.material-schema {
  margin-left: 12px;
  padding-left: 10px;
  border-left: 2px solid var(--border-color);
  margin-top: 6px;
}
.schema-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.schema-textarea {
  width: 100%;
  padding: 5px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  resize: vertical;
  margin-bottom: 6px;
  color: var(--text-primary);
  min-height: 56px;
}
.schema-textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.add-step-btn {
  margin-top: 10px;
  text-align: center;
  padding: 6px 14px;
  background: transparent;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  width: 100%;
}
.add-step-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: var(--accent-glow);
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