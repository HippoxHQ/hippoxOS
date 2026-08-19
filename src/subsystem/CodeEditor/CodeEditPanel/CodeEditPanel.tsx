import React, { useRef, useEffect } from "react";
import CodeEdit from "./CodeEdit";
import { Terminal } from "./Terminal";
interface CodeEditPanelProps {
  t: (key: string) => string;
  selectedFile: string | null;
  rightHeight: number;
  onRightResizeMouseDown: (e: React.MouseEvent) => void;
  isRightDragging: boolean;
  isRightHover: boolean;
  setIsRightHover: (value: boolean) => void;
  workspacePath?: string | null;
  onTabChange?: (filePath: string | null) => void;
}
const TERMINAL_MIN_HEIGHT = 80;
const TERMINAL_MAX_HEIGHT = 433;
const CodeEditPanel: React.FC<CodeEditPanelProps> = ({ t, selectedFile, rightHeight, onRightResizeMouseDown, isRightDragging, isRightHover, setIsRightHover, workspacePath, onTabChange }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const getTerminalHeight = (height: number): number => {
    const adjustedHeight = height - 10;
    return Math.min(Math.max(TERMINAL_MIN_HEIGHT, adjustedHeight), TERMINAL_MAX_HEIGHT);
  };
  const terminalHeight = getTerminalHeight(rightHeight);
  useEffect(() => {
    if (terminalContainerRef.current && !terminalRef.current) {
      terminalRef.current = new Terminal(t, workspacePath);
      terminalRef.current.mount(terminalContainerRef.current);
    }
    return () => {
      if (terminalRef.current) {
        terminalRef.current.unmount();
        terminalRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    const handleTerminalCwdChange = (event: CustomEvent) => {
      const { path } = event.detail;
      if (terminalRef.current && path) {
        terminalRef.current.updateWorkspacePath(path);
      }
    };
    window.addEventListener("terminal-change-cwd", handleTerminalCwdChange as EventListener);
    return () => {
      window.removeEventListener("terminal-change-cwd", handleTerminalCwdChange as EventListener);
    };
  }, []);
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.updateWorkspacePath(workspacePath || null);
    }
  }, [workspacePath]);
  useEffect(() => {
    if (terminalRef.current && selectedFile) {
      const lastSlash = Math.max(selectedFile.lastIndexOf("/"), selectedFile.lastIndexOf("\\"));
      const dirPath = lastSlash > 0 ? selectedFile.substring(0, lastSlash) : selectedFile;
      terminalRef.current.updateWorkspacePath(dirPath);
    }
  }, [selectedFile]);
  const isActive = isRightDragging || isRightHover;
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        width: "100%",
        minWidth: 0,
      }}
    >
      <style>{`
        .coding-right-resize-handle {
          position: relative;
          z-index: 1;
        }
        .coding-right-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: row-resize;
          z-index: 10;
        }
        .coding-right-resize-handle:hover::after {
          cursor: row-resize;
        }
      `}</style>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
          minWidth: 0,
        }}
      >
        <CodeEdit t={t} selectedFile={selectedFile} workspacePath={workspacePath} onTabChange={onTabChange} />
      </div>
      <div
        className="coding-right-resize-handle"
        style={{
          height: "1px",
          background: "var(--border-color)",
          cursor: "row-resize",
          flexShrink: 0,
          position: "relative",
        }}
        onMouseDown={onRightResizeMouseDown}
      ></div>
      <div
        style={{
          height: terminalHeight,
          minHeight: TERMINAL_MIN_HEIGHT,
          maxHeight: TERMINAL_MAX_HEIGHT,
          overflow: "hidden",
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <div ref={terminalContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
};
export default CodeEditPanel;
