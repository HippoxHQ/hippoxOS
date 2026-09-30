/**
 * Styles dedicated to the LLMModelConfig panel.
 */
export const llmModelConfigStyles = `
  .llm-config-root {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
    margin: 0;
    gap: 0;
  }
  .llm-config-loading {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 13px;
  }
  /* Top-level capability tabs: Chat / Image / Video / Audio */
  .llm-config-tabs {
    display: flex;
    align-items: stretch;
    gap: 0;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .llm-config-tab {
    flex: 1;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .llm-config-tab:hover {
    color: var(--text-primary);
    background: var(--hover-bg);
  }
  .llm-config-tab.active {
    color: var(--accent-color, #0066cc);
    border-bottom-color: var(--accent-color, #0066cc);
  }
  .llm-config-header {
    padding: 10px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .llm-config-search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .llm-config-search-wrapper {
    flex: 1;
    min-width: 0;
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 1.5px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
  }
  .llm-config-search-wrapper:focus-within {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }
  .llm-config-search-wrapper svg {
    flex-shrink: 0;
    color: var(--text-tertiary);
  }
  .llm-config-search-input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 13px;
    padding: 4px 0;
  }
  .llm-config-search-clear {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 14px;
    padding: 2px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .llm-config-search-clear:hover {
    color: var(--text-primary);
    background: var(--hover-bg);
  }
  .llm-config-batch-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
  }
  .llm-config-batch-count {
    font-size: 11px;
    color: var(--text-tertiary);
    margin-left: auto;
  }
  .llm-config-batch-divider {
    width: 1px;
    height: 20px;
    background: var(--border-color);
  }
  .llm-config-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0;
    margin: 0;
  }
  .llm-config-empty {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-muted);
    font-size: 13px;
  }
  .llm-config-card {
    background: var(--bg-secondary);
    padding: 10px;
    border-bottom: 1px solid var(--border-color);
    overflow: hidden;
  }
  .llm-config-card.selected {
    background: var(--bg-hover, var(--bg-tertiary));
  }
  .llm-config-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .llm-config-card-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    flex-shrink: 1;
    min-width: 0;
  }
  /* Localized provider description shown under the card title. */
  .llm-config-card-description {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: -6px 0 10px 0;
    padding: 0;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .llm-config-badge {
    background: var(--accent-color, #0066cc);
    color: #ffffff;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 12px;
    margin-left: 8px;
  }
  .llm-config-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--accent-color, #0066cc);
    flex-shrink: 0;
    margin-right: 8px;
  }
  .llm-config-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .llm-config-checkbox.hidden-checkbox {
    visibility: hidden;
    pointer-events: none;
  }
  .llm-config-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .llm-config-label {
    font-size: 13px;
    color: var(--text-primary);
    min-width: 100px;
    flex-shrink: 0;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .llm-config-input {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
  }
  .llm-config-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 8px;
  }
  .llm-config-btn {
    padding: 6px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
  }
  .llm-config-btn:hover {
    border-color: var(--accent-color);
    color: var(--text-primary);
  }
  .llm-config-btn.primary {
    background: var(--accent-color, #0066cc);
    color: #ffffff;
    border: none;
  }
  .llm-config-btn.primary:hover {
    opacity: 0.9;
  }
  .llm-config-btn.danger {
    color: var(--error-color, #dc2626);
    border-color: var(--error-color, #dc2626);
  }
  .llm-config-btn.danger:hover {
    background: rgba(220, 38, 38, 0.08);
  }
  .llm-config-btn.small {
    font-size: 11px;
    padding: 4px 10px;
  }
  .llm-config-btn.tiny {
    font-size: 11px;
    padding: 3px 12px;
  }
  .llm-config-btn.active {
    background: var(--accent-color);
    color: #ffffff;
    border-color: var(--accent-color);
  }
  .llm-config-btn.disabled,
  .llm-config-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .llm-provider-dropdown {
    position: relative;
    display: inline-flex;
    justify-content: flex-end;
    /* Stretch to fill the remaining space in the parent row, matching the
     * API-key input's layout behavior. min-width: 0 allows the element to
     * shrink below its intrinsic content width instead of forcing the row
     * to wrap. */
    flex: 1;
    min-width: 0;
    max-width: 100%;
  }
  .llm-provider-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    /* Fill the dropdown wrapper completely (the wrapper itself is flex: 1). */
    width: 100%;
    min-width: 0;
    max-width: 100%;
    height: 33px;
    padding: 2px 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    outline: none;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .llm-provider-dropdown-trigger:hover {
    border-color: var(--accent-color);
  }
  .llm-provider-dropdown-trigger.open {
    border-color: var(--accent-color);
  }
  .llm-provider-dropdown-trigger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .llm-provider-dropdown-trigger .llm-provider-dropdown-trigger-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
  .llm-provider-dropdown-trigger .llm-provider-dropdown-trigger-chevron {
    flex-shrink: 0;
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
  }
  .llm-provider-dropdown-menu {
    position: fixed;
    z-index: 9999;
    min-width: 200px;
    /* Slightly wider than before so the provider description can breathe. */
    max-width: 320px;
    max-height: 250px;
    height: 250px;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
    padding: 4px 0;
  }
  .llm-provider-dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }
  .llm-provider-dropdown-menu::-webkit-scrollbar-track {
    background: transparent;
  }
  .llm-provider-dropdown-menu::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }
  .llm-provider-dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb);
  }
  .llm-provider-dropdown-item {
    /* Stack the label and the description vertically so the description
     * can wrap onto its own line without breaking the layout. */
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 2px;
    padding: 6px 10px;
    font-size: 12px;
    color: var(--text-primary);
    cursor: pointer;
    /* Allow wrapping so the description can occupy multiple lines. */
    white-space: normal;
    overflow: hidden;
  }
  .llm-provider-dropdown-item:hover {
    background: var(--hover-bg);
  }
  .llm-provider-dropdown-item.selected {
    color: var(--accent-color);
    background: rgba(0, 150, 255, 0.08);
  }
  .llm-provider-dropdown-item .llm-provider-dropdown-item-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
  /* Localized provider description shown below the label inside the menu. */
  .llm-provider-dropdown-item .llm-provider-dropdown-item-description {
    display: -webkit-box;
    width: 100%;
    font-size: 11px;
    font-weight: 400;
    color: var(--text-secondary);
    line-height: 1.35;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    /* Clamp the description to at most 2 lines to keep the menu tidy. */
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
`;