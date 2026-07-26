export const sidebarStyles = `
  .sidebar {
    width: 45px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    user-select: none;
    z-index: 100;
    position: relative;
    justify-content: space-between;
  }
  .sidebar-header {
  padding: 2px 0;
  border-bottom: 1px solid var(--border-color);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
   .new-session-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 5px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    // transition: all 0.2s ease;
  }
   .new-session-icon-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
   .sidebar-nav-top {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 0;
  }
   .sidebar-nav-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 0;
    border-top: 1px solid var(--border-color);
  }
   .sidebar-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 5px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    // transition: all 0.2s ease;
    position: relative;
  }
   .sidebar-icon-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
   .sidebar-icon-btn.active {
    background: var(--accent-color);
    color: white;
  }
   .icon-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    background: var(--accent-color);
    border-radius: 5px;
    border: 1px solid var(--bg-secondary);
  }
   .menu-popup {
    position: fixed;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    width: 280px;
    max-height: 500px;
    overflow-y: auto;
    z-index: 201;
  }
   .menu-popup::-webkit-scrollbar {
    width: 4px;
  }
   .menu-popup::-webkit-scrollbar-track {
    background: transparent;
  }
   .menu-popup::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 5px;
  }
   .popup-section-title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--text-secondary);
    padding: 8px 12px 4px 12px;
  }
   .popup-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0px;
    cursor: pointer;
    // transition: all 0.15s ease;
    color: var(--text-primary);
    font-size: 13px;
    padding-left: 10px;
    padding-right: 20px;
  }
   .popup-menu-item:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
   .popup-menu-item.active {
    background: var(--accent-color);
    color: white;
  }
   .menu-popup > div > div,
  .menu-popup > div > .popup-menu-item,
  .menu-popup > .popup-menu-item {
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 0;
  }
   .menu-popup > div:last-child > div:last-child,
  .menu-popup > div:last-child > .popup-menu-item:last-child,
  .menu-popup > .popup-menu-item:last-child {
    border-bottom: none;
  }
   .menu-popup > div > div > .popup-menu-item {
    border-bottom: none;
  }
   .popup-menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
   .popup-menu-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
   .popup-menu-badge {
    background: var(--accent-color);
    color: white;
    font-size: 10px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 5px;
    min-width: 18px;
    text-align: center;
  }
   .popup-menu-item.active .popup-menu-badge {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
   .popup-menu-item.has-children {
    justify-content: space-between;
  }
   .popup-chevron {
    // transition: transform 0.2s ease;
    color: var(--text-secondary);
    font-size: 12px;
  }
   .popup-chevron.open {
    transform: rotate(90deg);
  }
   .popup-sub-menu {
    display: flex;
    flex-direction: column;
  }
   .popup-sub-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0px 10px 0px;
    cursor: pointer;
    // transition: all 0.15s ease;
    color: var(--text-primary);
    font-size: 12px;
    padding-left: 20px;
    padding-right: 20px;
  }
   .popup-sub-item:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
   .popup-sub-item.active {
    background: var(--accent-color);
    color: white;
  }
   .popup-sub-icon {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
   .popup-sub-sub-menu {
    margin-left: 28px;
    display: flex;
    flex-direction: column;
  }
   .popup-sub-sub-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px 6px 0;
    margin: 0 4px;
    cursor: pointer;
    // transition: all 0.15s ease;
    color: var(--text-primary);
    border-radius: 5px;
    font-size: 11px;
  }
   .popup-sub-sub-item:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
   .popup-sub-sub-item.active {
    background: var(--accent-color);
    color: white;
  }
   .popup-divider {
    height: 1px;
    background: var(--border-color);
    margin: 8px 12px;
  }
`;