import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import CodeEditPanel from "./CodeEditPanel/CodeEditPanel";
import FileTreePanel from "./FileTreePanel";
import DiffPanel from "./CodeEditPanel/DiffPanel";
import { configCommands } from "../../command/config";
/**
 * Ref interface for CodingPage
 * Exposed to parent components (CodeEditorChatPanel) for programmatic control
 *
 * This follows the same pattern as SandBox3DRef and EarthViewRef:
 * - Chat panel calls these methods to render diff data
 * - All calls show diff panel for user confirmation
 */
export interface CodingRef {
  /** Show diff panel with original and modified content */
  showDiff: (fileName: string, originalContent: string, modifiedContent: string) => void;
  /** Apply the diff - replace current file content */
  applyDiff: () => void;
  /** Discard the diff - close panel without changes */
  discardDiff: () => void;
  /** Check if diff panel is visible */
  isDiffVisible: () => boolean;
  /** Get current file content from editor */
  getCurrentFileContent: () => string;
}
interface CodingPageProps {
  t: (key: string) => string;
  onClose?: () => void;
  workspacePath?: string | null;
  onTabChange?: (filePath: string | null) => void;
}
/**
 * CodingPage - Main code editor layout component
 */
const CodingPage = forwardRef<CodingRef, CodingPageProps>(({ t, onClose, workspacePath, onTabChange }, ref) => {
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightHeight, setRightHeight] = useState(200);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLeftHover, setIsLeftHover] = useState(false);
  const [isRightHover, setIsRightHover] = useState(false);
  const [layoutSwapMode, setLayoutSwapMode] = useState<"terminal-left" | "chat-left">("terminal-left");
  const [isLayoutLoading, setIsLayoutLoading] = useState(true);
  // Ref to CodeEdit component for getting/setting file content
  const codeEditRef = useRef<{ getValue: () => string; setValue: (content: string) => void } | null>(null);
  // Diff panel state
  const [isDiffVisible, setIsDiffVisible] = useState(false);
  const [diffPanelWidth, setDiffPanelWidth] = useState(420);
  const [diffData, setDiffData] = useState<{
    fileName: string;
    originalContent: string;
    modifiedContent: string;
  } | null>(null);
  const isDraggingDiff = useRef(false);
  const dragStartDiffX = useRef(0);
  const dragStartDiffWidth = useRef(0);
  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };
  const handleTabChange = useCallback(
    (filePath: string | null) => {
      if (filePath !== null) {
        setSelectedFile(filePath);
      } else {
        setSelectedFile(null);
      }
      onTabChange?.(filePath);
    },
    [onTabChange],
  );
  const handleLeftResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingLeft.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  /**
   * Show diff panel with original and modified content
   * Called by CodeEditorChatPanel when LLM returns a file modification
   */
  const showDiff = useCallback((fileName: string, originalContent: string, modifiedContent: string) => {
    setDiffData({ fileName, originalContent, modifiedContent });
    setIsDiffVisible(true);
  }, []);
  /**
   * Apply the diff - replace current file content
   * This updates the editor with the new content
   */
  const applyDiff = useCallback(() => {
    if (!diffData) return;
    // Update the editor with the new content
    if (codeEditRef.current) {
      codeEditRef.current.setValue(diffData.modifiedContent);
    }
    setIsDiffVisible(false);
    // Keep diffData so it can be shown again when reopening
  }, [diffData]);
  /**
   * Discard the diff - close panel without changes
   */
  const discardDiff = useCallback(() => {
    setIsDiffVisible(false);
    // Keep diffData so it can be shown again when reopening
  }, []);
  /**
   * Close diff panel
   */
  const closeDiff = useCallback(() => {
    setIsDiffVisible(false);
    // Keep diffData so it can be shown again when reopening
  }, []);
  /**
   * Check if diff panel is visible
   */
  const isDiffVisibleFn = useCallback(() => {
    return isDiffVisible;
  }, [isDiffVisible]);
  /**
   * Get current file content from editor
   * Used by ChatPanel to send file context to LLM
   */
  const getCurrentFileContent = useCallback(() => {
    if (codeEditRef.current) {
      return codeEditRef.current.getValue();
    }
    return "";
  }, []);
  // Diff panel resize handler
  const handleDiffResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingDiff.current = true;
    dragStartDiffX.current = e.clientX;
    dragStartDiffWidth.current = diffPanelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  /**
   * Expose methods to parent via ref
   * Same pattern as 3D Sandbox and EarthView
   */
  useImperativeHandle(ref, () => ({
    showDiff,
    applyDiff,
    discardDiff,
    isDiffVisible: isDiffVisibleFn,
    getCurrentFileContent,
  }));
  /**
   * Listen for toggle-diff-panel event from CodeEdit tab button
   */
  useEffect(() => {
    const handleToggleDiff = (event: CustomEvent) => {
      const { visible } = event.detail || {};
      if (visible !== undefined) {
        setIsDiffVisible(visible);
        // Don't set placeholder data - show empty if no diffData exists
      } else {
        setIsDiffVisible((prev) => !prev);
      }
    };
    window.addEventListener("toggle-diff-panel", handleToggleDiff as EventListener);
    return () => {
      window.removeEventListener("toggle-diff-panel", handleToggleDiff as EventListener);
    };
  }, []);
  useEffect(() => {}, [workspacePath]);
  useEffect(() => {
    const loadLayoutMode = async () => {
      try {
        const mode = await configCommands.getSettingsCodeEditorLayoutSwapMode();
        if (mode === "terminal-left" || mode === "chat-left") {
          setLayoutSwapMode(mode);
        }
      } catch (error) {
        console.error("Failed to load code editor layout mode:", error);
      } finally {
        setIsLayoutLoading(false);
      }
    };
    loadLayoutMode();
  }, []);
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "codeeditor") {
        setLayoutSwapMode(mode);
      }
    };
    window.addEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    return () => {
      window.removeEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    };
  }, []);
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft.current) {
        const delta = e.clientX - dragStartX.current;
        const newWidth = Math.min(500, Math.max(120, dragStartWidth.current + delta));
        setLeftWidth(newWidth);
      }
      if (isDraggingRight.current) {
        const containerHeight = containerRef.current?.clientHeight || 600;
        const delta = -(e.clientY - dragStartY.current);
        const newHeight = Math.min(containerHeight * 0.8, Math.max(80, dragStartHeight.current + delta));
        setRightHeight(newHeight);
      }
      if (isDraggingDiff.current) {
        const delta = dragStartDiffX.current - e.clientX;
        const newWidth = Math.min(640, Math.max(280, dragStartDiffWidth.current + delta));
        setDiffPanelWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      if (isDraggingLeft.current) {
        isDraggingLeft.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      if (isDraggingRight.current) {
        isDraggingRight.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      if (isDraggingDiff.current) {
        isDraggingDiff.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [leftWidth, rightHeight, diffPanelWidth]);
  const handleRightResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRight.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = rightHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };
  const isLeftDragging = isDraggingLeft.current;
  const isRightDragging = isDraggingRight.current;
  const isLeftActive = isLeftDragging || isLeftHover;
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      <style>{`
        .coding-left-resize-handle {
          position: relative;
          z-index: 1;
        }
        .coding-left-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
        .coding-left-resize-handle:hover::after {
          cursor: col-resize;
        }
        .coding-diff-resize-handle {
          position: relative;
          z-index: 1;
        }
        .coding-diff-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
        .coding-diff-resize-handle:hover::after {
          cursor: col-resize;
        }
      `}</style>
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Left: File Tree */}
        <div style={{ width: leftWidth, minWidth: 0, flexShrink: 0 }}>
          <FileTreePanel t={t} onFileSelect={handleFileSelect} selectedFile={selectedFile} workspacePath={workspacePath} />
        </div>
        {/* Resize handle between FileTree and Editor */}
        <div
          className="coding-left-resize-handle"
          style={{
            width: "1px",
            background: "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
          }}
          onMouseDown={handleLeftResizeMouseDown}
        />
        {/* Middle: Code Editor + Terminal */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <CodeEditPanel
            t={t}
            selectedFile={selectedFile}
            rightHeight={rightHeight}
            onRightResizeMouseDown={handleRightResizeMouseDown}
            isRightDragging={isRightDragging}
            isRightHover={isRightHover}
            setIsRightHover={setIsRightHover}
            workspacePath={workspacePath}
            onTabChange={handleTabChange}
            onCodeEditRef={(ref) => {
              codeEditRef.current = ref;
            }}
          />
        </div>
        {/* Resize handle between Editor and Diff Panel */}
        {isDiffVisible && (
          <div
            className="coding-diff-resize-handle"
            style={{
              width: "1px",
              background: "var(--border-color)",
              cursor: "col-resize",
              flexShrink: 0,
              position: "relative",
            }}
            onMouseDown={handleDiffResizeMouseDown}
          />
        )}
        {/* Right: Diff Panel */}
        {isDiffVisible && (
          <div
            style={{
              width: diffPanelWidth,
              minWidth: 280,
              maxWidth: 640,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <DiffPanel isVisible={isDiffVisible} fileName={diffData?.fileName} originalContent={diffData?.originalContent || ""} modifiedContent={diffData?.modifiedContent || ""} onApply={applyDiff} onDiscard={discardDiff} onClose={closeDiff} />
          </div>
        )}
      </div>
    </div>
  );
});
CodingPage.displayName = "CodingPage";
export default CodingPage;
