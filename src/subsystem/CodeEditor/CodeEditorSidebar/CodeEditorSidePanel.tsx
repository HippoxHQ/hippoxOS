import React from "react";
import FileTreePanel from "../FileTreePanel";
import { CodeEditorSidebarView } from ".";
interface CodeEditorSidePanelProps {
  /** Which inline side panel view to render */
  view: CodeEditorSidebarView;
  /** Panel width in px (controlled by the parent) */
  width: number;
  /** Minimum panel width in px */
  minWidth: number;
  /** Maximum panel width in px */
  maxWidth: number;
  /** Translation function */
  t: (key: string, params?: any) => string;
  /** Selected file (passed to the file tree) */
  selectedFile: string | null;
  /** Workspace path (passed to the file tree) */
  workspacePath?: string | null;
  /** File selection callback */
  onFileSelect: (path: string) => void;
  /** Resize handle mouse-down handler (starts a drag) */
  onResizeMouseDown?: (e: React.MouseEvent) => void;
  /** Whether the resize handle is currently hovered */
  isResizeHover?: boolean;
  /** Called when the resize handle is hovered/unhovered */
  setIsResizeHover?: (value: boolean) => void;
}
/**
 * CodeEditorSidePanel - The dedicated left inline side panel region.
 *
 * This component owns the visual container for the currently active
 * inline side panel view. Currently only the file tree is hosted here,
 * but new views can be added by extending `CodeEditorSidebarView` and
 * adding a case below.
 *
 * It sits immediately to the right of the 45px `CodeEditorSidebar`,
 * mirroring the layout used by the blockchain dashboard.
 *
 * The panel width is fully controlled by the parent, which also owns
 * the resize drag logic. A thin resize handle on the right edge lets
 * the user resize the panel between `minWidth` and `maxWidth`.
 *
 * NOTE: History is NOT rendered here. It opens as a slide-out drawer
 * (see `renderHistoryDrawer` in CodeEditorPage) so it visually matches
 * the blockchain page.
 */
export const CodeEditorSidePanel: React.FC<CodeEditorSidePanelProps> = ({ view, width, minWidth, maxWidth, t, selectedFile, workspacePath, onFileSelect, onResizeMouseDown, isResizeHover = false, setIsResizeHover }) => {
  // Nothing to render when the sidebar has collapsed the panel
  if (view === "none") {
    return null;
  }
  /**
   * Render the active panel content.
   * Add a new case here when adding new inline side panel views.
   */
  const renderContent = () => {
    switch (view) {
      case "files":
        return <FileTreePanel t={t} onFileSelect={onFileSelect} selectedFile={selectedFile} workspacePath={workspacePath} />;
      default:
        return null;
    }
  };
  // Clamp the width defensively in case the parent passed something out of range
  const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));
  return (
    <div
      className="codeeditor-side-panel"
      style={{
        width: `${clampedWidth}px`,
        minWidth: `${minWidth}px`,
        maxWidth: `${maxWidth}px`,
        height: "100%",
        background: "var(--bg-secondary)",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* Panel content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {renderContent()}
      </div>
      {/* Resize handle on the right edge */}
      <div
        className="codeeditor-side-panel-resize-handle"
        onMouseDown={onResizeMouseDown}
        onMouseEnter={() => setIsResizeHover?.(true)}
        onMouseLeave={() => setIsResizeHover?.(false)}
        style={{
          width: "1px",
          background: isResizeHover ? "var(--scrollbar-thumb)" : "var(--border-color)",
          cursor: "col-resize",
          flexShrink: 0,
          position: "relative",
        }}
      />
      {/* Enlarged invisible hit area for the resize handle */}
      <style>{`
        .codeeditor-side-panel-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -6px;
          right: -6px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
      `}</style>
    </div>
  );
};
export default CodeEditorSidePanel;
