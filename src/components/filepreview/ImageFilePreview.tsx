import React, { useState, useEffect, useCallback } from "react";
import { filesCommands } from "../../command/files";
import { UploadFile } from "../../core/types";

interface ImageFilePreviewProps {
  file: UploadFile | null;
  onClose: () => void;
  t?: (key: string) => string;
}

const ImageFilePreview: React.FC<ImageFilePreviewProps> = ({
  file,
  onClose,
  t = (key: string) => key,
}) => {
  const [imageBase64, setImageBase64] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setImageBase64("");
      setError(null);
      readImageFile(file.path);
    }
  }, [file, readImageFile]);

  if (!file) return null;

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
          <span>🖼️</span>
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
        Size: {formatFileSize(file.size)} | Type: {file.type || "Unknown"}
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          background: "var(--bg-primary)",
        }}
      >
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
        {!isLoading && !error && imageBase64 && (
          <img
            src={imageBase64}
            alt={file.name}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ImageFilePreview;