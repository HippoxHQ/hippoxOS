import React, { useState, useEffect, useCallback } from "react";
import { UploadFile } from "../type";
import { filesCommands } from "../api/files";

interface FilePreviewProps {
  file: UploadFile | null;
  onClose: () => void;
  t?: (key: string) => string;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onClose,
  t = (key: string) => key,
}) => {
  const [fileContent, setFileContent] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readTextFile = useCallback(async (filePath: string) => {
    setIsLoading(true);
    try {
      const content = await filesCommands.readTextFile(filePath);
      setFileContent(content);
    } catch (err) {
      setError("Failed to read file");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const readImageFile = useCallback(async (filePath: string) => {
    setIsLoading(true);
    try {
      const base64 = await filesCommands.readImageBase64(filePath);
      setImageBase64(base64);
    } catch (err) {
      setError("Failed to load image");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (file?.path) {
      setFileContent("");
      setImageBase64("");
      setError(null);

      if (file.type?.startsWith("image/")) {
        readImageFile(file.path);
      } else if (
        file.name?.match(/\.(txt|md|json|js|ts|jsx|tsx|html|css|xml|py|rs)$/i)
      ) {
        readTextFile(file.path);
      } else {
        setError("Preview not available");
      }
    }
  }, [file]);

  if (!file) return null;

  const isImage = file.type?.startsWith("image/");
  const isText =
    !isImage &&
    file.name?.match(/\.(txt|md|json|js|ts|jsx|tsx|html|css|xml|py|rs)$/i);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
          paddingBottom: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          <span>{isImage ? "🖼️" : "📄"}</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 200,
            }}
          >
            {file.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 16,
            padding: "4px 8px",
            borderRadius: 6,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--hover-bg)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          ✕
        </button>
      </div>

      <div
        style={{
          padding: "8px 16px",
          background: "var(--bg-tertiary)",
          fontSize: 12,
          color: "var(--text-secondary)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        大小: {formatFileSize(file.size)} | 类型: {file.type || "未知"}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {isLoading && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              padding: 40,
            }}
          >
            加载中...
          </div>
        )}
        {error && (
          <div style={{ color: "#ff6666", textAlign: "center", padding: 40 }}>
            {error}
          </div>
        )}
        {!isLoading && !error && isImage && imageBase64 && (
          <img
            src={imageBase64}
            alt={file.name}
            style={{ maxWidth: "100%", borderRadius: 8 }}
          />
        )}
        {!isLoading && !error && isText && (
          <pre
            style={{
              background: "var(--bg-secondary)",
              padding: 16,
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "monospace",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {fileContent || "文件内容为空"}
          </pre>
        )}
        {!isLoading && !error && !isImage && !isText && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              padding: 40,
            }}
          >
            📄 此文件类型暂不支持预览
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
