import React, { useState, useEffect, useCallback } from "react";
import { filesCommands } from "../../../../command/files";
import { UploadFile } from "../../../../core/types";

interface TextFilePreviewProps {
  file: UploadFile | null;
  onClose: () => void;
  t?: (key: string) => string;
}

const TextFilePreview: React.FC<TextFilePreviewProps> = ({
  file,
  onClose,
  t = (key: string) => key,
}) => {
  const [fileContent, setFileContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileType, setFileType] = useState<string>("");
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return "Unknown size";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }, []);
  const readTextFile = useCallback(
    async (filePath: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const [content, fileInfo] = await Promise.all([
          filesCommands.readTextFile(filePath),
          filesCommands.getFileInfo(filePath).catch(() => null),
        ]);
        setFileContent(content);
        setFileSize(fileInfo?.size || 0);
        setFileType(fileInfo?.mime_type || file?.type || "Unknown");
      } catch (err) {
        setError("Failed to read file");
      } finally {
        setIsLoading(false);
      }
    },
    [file?.type],
  );
  useEffect(() => {
    if (file?.path) {
      setFileContent("");
      setError(null);
      readTextFile(file.path);
    }
  }, [file?.path]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!file) return null;
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
          paddingBottom: "5.5px",
          paddingTop: "5.5px",
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
          <span>📄</span>
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
        Size: {formatFileSize(fileSize)} | Type: {fileType}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {isLoading && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              padding: 40,
            }}
          >
            Loading...
          </div>
        )}
        {error && (
          <div style={{ color: "#ff6666", textAlign: "center", padding: 40 }}>
            {error}
          </div>
        )}
        {!isLoading && !error && (
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
            {fileContent || "File is empty"}
          </pre>
        )}
      </div>
    </div>
  );
};

export default TextFilePreview;
