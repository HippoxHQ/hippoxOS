import React, { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { showToast, ToastType } from "../../components/Toast";
import { stat } from "@tauri-apps/plugin-fs";

interface CodeEditorWelcomePageProps {
  t: (key: string, params?: any) => string;
  language?: "zh" | "en";
  onSelectWorkspace: (
    workspacePath: string,
    workspaceType: "directory" | "file",
  ) => Promise<void>;
  isLoading?: boolean;
}

const CodeEditorWelcomePage: React.FC<CodeEditorWelcomePageProps> = ({
  t,
  language = "en",
  onSelectWorkspace,
  isLoading = false,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"directory" | "file">(
    "directory",
  );
  const [isDragOver, setIsDragOver] = useState(false);

  // 只保留 UI 高亮，不处理任何业务逻辑
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

  // 删除所有 files-dropped 和 file-drop 监听！！！
  // 拖拽创建会话由 CodeEditorPage 统一处理

  const checkIsDirectory = async (path: string): Promise<boolean> => {
    try {
      const info = await stat(path);
      return info.isDirectory;
    } catch {
      const lastPart = path.split(/[\\/]/).pop() || "";
      return !lastPart.includes(".");
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title:
          language === "zh" ? "选择工作区目录" : "Select Workspace Directory",
      });
      if (selected && typeof selected === "string") {
        setSelectedPath(selected);
        setSelectedType("directory");
        await onSelectWorkspace(selected, "directory");
      }
    } catch (error) {
      console.error("Failed to select workspace:", error);
    }
  };

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
      console.error("Failed to select file:", error);
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
      {/* 拖拽高亮遮罩 */}
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
            // transition: "all 0.2s ease",
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
        <div
          style={{
            fontSize: "64px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          💻
        </div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "8px",
          }}
        >
          {isZh ? "Hippox 代码编辑器" : "Hippox Code Editor"}
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginBottom: "32px",
            lineHeight: 1.6,
          }}
        >
          {isZh
            ? "选择一个工作区目录或文件开始编码，AI 助手将协助你完成所有开发任务"
            : "Select a workspace directory or file to start coding, AI assistant will help you with all development tasks"}
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div
            onClick={handleSelectFolder}
            style={{
              flex: 1,
              border: "2px dashed var(--border-color)",
              borderRadius: "12px",
              padding: "32px 16px",
              cursor: "pointer",
              background: "var(--bg-secondary)",
              // transition: "all 0.2s",
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
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📁</div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
              {isZh ? "选择目录" : "Select Folder"}
            </div>
          </div>

          <div
            onClick={handleSelectFile}
            style={{
              flex: 1,
              border: "2px dashed var(--border-color)",
              borderRadius: "12px",
              padding: "32px 16px",
              cursor: "pointer",
              background: "var(--bg-secondary)",
              // transition: "all 0.2s",
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
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
              {isZh ? "选择文件" : "Select File"}
            </div>
          </div>
        </div>

        <div
          style={{
            border: `2px dashed ${isDragOver ? "var(--accent-color)" : "var(--border-color)"}`,
            borderRadius: "12px",
            padding: "24px 16px",
            background: isDragOver
              ? "var(--accent-glow)"
              : "var(--bg-secondary)",
            marginBottom: "24px",
            // transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: isDragOver ? "var(--accent-color)" : "var(--text-muted)",
              // transition: "color 0.2s ease",
            }}
          >
            {isDragOver
              ? isZh
                ? "释放以打开文件/文件夹"
                : "Release to open file/folder"
              : isZh
                ? "或将文件夹/文件拖拽到窗口"
                : "Or drag a folder/file to the window"}
          </div>
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
              {selectedType === "directory" ? "📁" : "📄"} {selectedPath}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "8px",
          }}
        >
          {isZh
            ? "选择工作区后，Hippox 将自动创建会话并加载内容"
            : "After selecting a workspace, Hippox will automatically create a session and load the content"}
        </div>

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
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "16px",
                border: "2px solid var(--border-color)",
                borderTop: "2px solid var(--accent-color)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            {isZh ? "正在创建会话..." : "Creating session..."}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dropHighlight {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default CodeEditorWelcomePage;
