import React from "react";
import { FolderTree, History, GitBranch } from "lucide-react";
/**
 * Sidebar view keys for the code editor.
 * Extend this union when adding more side panel views in the future.
 * - "files": shows the file tree panel inline next to the sidebar
 * - "git": shows the dedicated Git panel that replaces the main content area
 * - "none": no inline side panel is open
 *
 * NOTE: History is NOT part of this union. History opens as a
 * slide-out drawer (like the blockchain page), controlled by the
 * `onToggleHistory` / `isHistoryOpen` props instead.
 */
export type CodeEditorSidebarView = "files" | "git" | "none";
interface CodeEditorSidebarProps {
  /** Currently active inline side panel view */
  activeView: CodeEditorSidebarView;
  /** Switch the active inline side panel view */
  onViewChange: (view: CodeEditorSidebarView) => void;
  /** Toggle the history drawer */
  onToggleHistory?: () => void;
  /** Whether the history drawer is currently open */
  isHistoryOpen?: boolean;
  /** Language for tooltips */
  language?: "zh" | "en";
}
/**
 * CodeEditorSidebar - 45px wide icon sidebar for the code editor.
 * Mirrors the visual style of BlockchainSidebar.
 *
 * Top: Files button (toggles the inline file tree side panel)
 * Top: Git button (opens the dedicated Git panel over the main content area)
 * Bottom: History button (toggles the slide-out history drawer)
 */
export const CodeEditorSidebar: React.FC<CodeEditorSidebarProps> = ({ activeView, onViewChange, onToggleHistory, isHistoryOpen = false, language = "en" }) => {
  const isZh = language === "zh";
  /**
   * Generic renderer for a single sidebar icon button.
   * Keeps all buttons visually identical to the blockchain sidebar.
   */
  const renderButton = (opts: { key: string; icon: React.ReactNode; label: string; isActive: boolean; onClick?: () => void }) => {
    const { key, icon, label, isActive, onClick } = opts;
    return (
      <button
        key={key}
        onClick={onClick}
        title={label}
        style={{
          width: 30,
          height: 30,
          margin: "2px auto",
          borderRadius: 5,
          border: "none",
          background: isActive ? "var(--accent-color, #58a6ff)" : "transparent",
          color: isActive ? "white" : "var(--text-secondary, #8b949e)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s, color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "var(--hover-bg, #21262d)";
            e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
          }
        }}
      >
        {icon}
      </button>
    );
  };
  return (
    <div
      style={{
        width: 45,
        minWidth: 45,
        height: "100%",
        background: "var(--bg-secondary, #161b22)",
        borderRight: "1px solid var(--border-color, #30363d)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 8,
        boxSizing: "border-box",
        flexShrink: 0,
        gap: 2,
      }}
    >
      {/* Top group: Files + Git toggles */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {renderButton({
          key: "files",
          icon: <FolderTree size={18} />,
          label: isZh ? "文件" : "Files",
          isActive: activeView === "files",
          onClick: () => onViewChange(activeView === "files" ? "none" : "files"),
        })}
        {renderButton({
          key: "git",
          icon: <GitBranch size={18} />,
          label: isZh ? "Git" : "Git",
          isActive: activeView === "git",
          onClick: () => onViewChange(activeView === "git" ? "none" : "git"),
        })}
      </div>
      {/* Spacer pushes bottom items down */}
      <div style={{ flex: 1 }} />
      {/* Bottom group: History toggle (slide-out drawer) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          borderTop: "1px solid var(--border-color, #30363d)",
          paddingTop: 6,
        }}
      >
        {renderButton({
          key: "history",
          icon: <History size={18} />,
          label: isZh ? "历史会话" : "History",
          isActive: isHistoryOpen,
          onClick: onToggleHistory,
        })}
      </div>
    </div>
  );
};
export default CodeEditorSidebar;
