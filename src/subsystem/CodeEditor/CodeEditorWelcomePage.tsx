import React, { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { showToast, ToastType } from "../../components/Toast";
import { stat } from "@tauri-apps/plugin-fs";
import { FolderIcon, FileIcon, GithubIcon, SpinnerIcon } from "../../icons";
import GithubClone from "./GithubClone";
import { githubCommands } from "../../command/net/github";
interface CodeEditorWelcomePageProps {
  t: (key: string, params?: any) => string;
  language?: "zh" | "en";
  onSelectWorkspace: (workspacePath: string, workspaceType: "directory" | "file") => Promise<void>;
  onCloneFromGithub?: (repoUrl: string, targetPath?: string, branch?: string) => Promise<void>;
  isLoading?: boolean;
}
const CodeEditorWelcomePage: React.FC<CodeEditorWelcomePageProps> = ({ t, language = "en", onSelectWorkspace, onCloneFromGithub, isLoading = false }) => {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"directory" | "file">("directory");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showGithubDialog, setShowGithubDialog] = useState(false);
  // Setup drag and drop listeners for file/folder drop
  useEffect(() => {
    let unlistenDragEnter: (() => void) | undefined;
    let unlistenDragLeave: (() => void) | undefined;
    const setupListeners = async () => {
      unlistenDragEnter = await listen<any>("drag-enter", () => {
        setIsDragOver(true);
      });
      unlistenDragLeave = await listen<void>("drag-leave", () => {
        setIsDragOver(false);
      });
    };
    setupListeners();
    return () => {
      if (unlistenDragEnter) unlistenDragEnter();
      if (unlistenDragLeave) unlistenDragLeave();
    };
  }, []);
  // Handle folder selection via system dialog
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: language === "zh" ? "选择工作区目录" : "Select Workspace Directory",
      });
      if (selected && typeof selected === "string") {
        setSelectedPath(selected);
        setSelectedType("directory");
        await onSelectWorkspace(selected, "directory");
      }
    } catch (error) {
      showToast(ToastType.ERROR, language === "zh" ? "选择目录失败" : "Failed to select directory");
    }
  };
  // Handle file selection via system dialog
  const handleSelectFile = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: language === "zh" ? "选择文件" : "Select File",
        filters: [
          {
            name: language === "zh" ? "所有文件" : "All Files",
            extensions: ["*"],
          },
        ],
      });
      if (selected && typeof selected === "string") {
        setSelectedPath(selected);
        setSelectedType("file");
        await onSelectWorkspace(selected, "file");
      }
    } catch (error) {
      showToast(ToastType.ERROR, language === "zh" ? "选择文件失败" : "Failed to select file");
    }
  };
  // Open GitHub clone dialog
  const handleGithubClick = () => {
    setShowGithubDialog(true);
  };
  /**
   * Handle GitHub clone operation
   * - Direct clone using githubCommands (same as CodeEditorPage)
   * - No event-based waiting mechanism to avoid hanging
   * - After successful clone, select the workspace
   */
  const handleGithubClone = async (repoUrl: string, targetPath: string, branch: string) => {
    try {
      // Use provided callback if available, otherwise direct clone
      if (onCloneFromGithub) {
        await onCloneFromGithub(repoUrl, targetPath, branch);
      } else {
        // Direct clone using githubCommands - same pattern as CodeEditorPage
        console.log("[CodeEditorWelcomePage] Cloning repository:", {
          repo: repoUrl,
          target: targetPath,
          branch: branch || "main",
        });
        await githubCommands.cloneRepository(repoUrl, targetPath, branch || "main");
        // After successful clone, select the workspace
        await onSelectWorkspace(targetPath, "directory");
      }
      // Close dialog on success
      setShowGithubDialog(false);
      // Dispatch event for any listeners
      window.dispatchEvent(
        new CustomEvent("github-clone-complete", {
          detail: { repoUrl, targetPath, branch },
        }),
      );
    } catch (error) {
      console.error("[CodeEditorWelcomePage] Clone failed:", error);
      showToast(ToastType.ERROR, language === "zh" ? "克隆失败" : "Clone Failed");
      throw error;
    }
  };
  const isZh = language === "zh";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        padding: "40px",
        background: "var(--bg-primary)",
        overflow: "auto",
        position: "relative",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 102, 204, 0.08)",
            border: "3px dashed var(--accent-color)",
            borderRadius: "12px",
            pointerEvents: "none",
            zIndex: 10,
            animation: "dropHighlight 0.3s ease",
          }}
        />
      )}
      <div
        style={{
          maxWidth: "520px",
          width: "100%",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo and title */}
        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "var(--bg-secondary)",
              border: "2px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 400,
              color: "var(--accent-color)",
              fontFamily: "monospace",
            }}
          >
            {`{ }`}
          </div>
          <div>
            <div
              style={{
                fontSize: "25px",
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.5px",
              }}
            >
              Hippox
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: 400,
                letterSpacing: "0.3px",
              }}
            >
              {isZh ? "代码编辑器" : "Code Editor"}
            </div>
          </div>
        </div>
        {/* Description */}
        <p
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginBottom: "32px",
            lineHeight: 1.6,
          }}
        >
          {isZh ? "选择一个工作区目录或文件开始编码，LLM 将协助你完成所有开发任务" : "Select a workspace directory or file to start coding, LLM assistant will help you with all development tasks"}
        </p>
        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {/* Select Folder */}
          <div
            onClick={handleSelectFolder}
            style={{
              flex: 1,
              border: "2px dashed var(--border-color)",
              borderRadius: "12px",
              padding: "32px 16px",
              cursor: "pointer",
              background: "var(--bg-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.background = "var(--bg-secondary)";
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
              <FolderIcon size={32} />
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{isZh ? "选择目录" : "Select Folder"}</div>
          </div>
          {/* Select File */}
          <div
            onClick={handleSelectFile}
            style={{
              flex: 1,
              border: "2px dashed var(--border-color)",
              borderRadius: "12px",
              padding: "32px 16px",
              cursor: "pointer",
              background: "var(--bg-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.background = "var(--bg-secondary)";
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
              <FileIcon size={32} />
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{isZh ? "选择文件" : "Select File"}</div>
          </div>
          {/* GitHub Clone */}
          <div
            onClick={handleGithubClick}
            style={{
              flex: 1,
              border: "2px dashed var(--border-color)",
              borderRadius: "12px",
              padding: "32px 16px",
              cursor: "pointer",
              background: "var(--bg-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.background = "var(--bg-secondary)";
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
              <GithubIcon size={32} />
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{isZh ? "GitHub 拉取" : "GitHub Clone"}</div>
          </div>
        </div>
        {/* Drag and drop area */}
        <div
          style={{
            border: `2px dashed ${isDragOver ? "var(--accent-color)" : "var(--border-color)"}`,
            borderRadius: "12px",
            padding: "24px 16px",
            background: isDragOver ? "var(--accent-glow)" : "var(--bg-secondary)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: isDragOver ? "var(--accent-color)" : "var(--text-muted)",
            }}
          >
            {isDragOver ? (isZh ? "释放以打开文件/文件夹" : "Release to open file/folder") : isZh ? "或将文件夹/文件拖拽到窗口" : "Or drag a folder/file to the window"}
          </div>
          {/* Show selected path */}
          {selectedPath && (
            <div
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: "var(--accent-color)",
                wordBreak: "break-all",
                background: "var(--bg-tertiary)",
                padding: "8px 12px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {selectedType === "directory" ? <FolderIcon size={16} /> : <FileIcon size={16} />}
              {selectedPath}
            </div>
          )}
        </div>
        {/* Helper text */}
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "8px",
          }}
        >
          {isZh ? "选择工作区后，Hippox 将自动创建会话并加载内容" : "After selecting a workspace, Hippox will automatically create a session and load the content"}
        </div>
        {/* Loading indicator */}
        {isLoading && (
          <div
            style={{
              marginTop: "16px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <SpinnerIcon size={16} />
            {isZh ? "正在创建会话..." : "Creating session..."}
          </div>
        )}
      </div>
      {/* GitHub Clone Dialog */}
      <GithubClone t={t} language={language} isOpen={showGithubDialog} onClose={() => setShowGithubDialog(false)} onClone={handleGithubClone} isLoading={isLoading} />
      {/* Global styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dropHighlight {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
export default CodeEditorWelcomePage;
