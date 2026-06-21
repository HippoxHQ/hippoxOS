import React, { useState, useEffect, useRef } from "react";
import { getFileIcon } from "../../../common";
import { UploadFile } from "../../../core/types";
import { filesCommands } from "../../../command/files";

interface MessageFileGridProps {
  files: UploadFile[];
  onFileClick?: (file: UploadFile) => void;
  formatFileSize: (bytes: number) => string;
}

export const MessageFileGrid: React.FC<MessageFileGridProps> = ({
  files,
  onFileClick,
  formatFileSize,
}) => {
  const [skillNames, setSkillNames] = useState<Map<string, string>>(new Map());
  const [imagePreviews, setImagePreviews] = useState<Map<string, string>>(
    new Map(),
  );
  const isMountedRef = useRef(true);

  const isSkillFile = (file: UploadFile): boolean => {
    return file.name?.endsWith(".md") || file.name?.endsWith(".skill.md");
  };

  const isImageFile = (file: UploadFile): boolean => {
    const imageExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".webp",
      ".bmp",
      ".svg",
      ".ico",
    ];
    const name = file.name?.toLowerCase() || "";
    return imageExtensions.some((ext) => name.endsWith(ext));
  };

  const getSkillIcon = () => "⚡";

  const extractSkillName = (content: string): string => {
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return trimmed.replace("# ", "").trim();
      }
    }
    return "";
  };

  const getSkillDisplayName = async (file: UploadFile): Promise<string> => {
    if (!file.path) {
      return file.name || "skill.md";
    }

    try {
      const exists = await filesCommands.pathExists(file.path);
      if (!exists) {
        return "skill.md";
      }

      const content = await filesCommands.readTextFile(file.path);
      const name = extractSkillName(content);
      return name || file.name || "skill.md";
    } catch (error) {
      console.error("Failed to read skill file:", file.path, error);
      return file.name || "skill.md";
    }
  };

  const loadImagePreview = async (file: UploadFile): Promise<string> => {
    if (!file.path) return "";

    try {
      const exists = await filesCommands.pathExists(file.path);
      if (!exists) {
        return "";
      }

      const base64 = await filesCommands.readImageBase64(file.path);
      return base64;
    } catch (error) {
      console.error("Failed to load image preview:", file.path, error);
      return "";
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const loadData = async () => {
      const newSkillNames = new Map<string, string>();
      const newImagePreviews = new Map<string, string>();

      for (const file of files) {
        const key = file.id || file.path || file.name;

        if (isSkillFile(file)) {
          const displayName = await getSkillDisplayName(file);
          if (!isMountedRef.current) return;
          newSkillNames.set(key, displayName);
        }

        if (isImageFile(file)) {
          const preview = await loadImagePreview(file);
          if (!isMountedRef.current) return;
          if (preview) {
            newImagePreviews.set(key, preview);
          }
        }
      }

      if (isMountedRef.current) {
        setSkillNames(newSkillNames);
        setImagePreviews(newImagePreviews);
      }
    };

    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [files]);

  const getDisplayName = (file: UploadFile): string => {
    if (!isSkillFile(file)) {
      return file.name;
    }

    const key = file.id || file.path || file.name;
    const skillName = skillNames.get(key);

    if (skillName) {
      return skillName;
    }

    return file.name || "skill.md";
  };

  const getImagePreview = (file: UploadFile): string | undefined => {
    const key = file.id || file.path || file.name;
    return imagePreviews.get(key);
  };

  return (
    <div
      className="message-files-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px",
        marginBottom: "8px",
        maxWidth: "300px",
      }}
    >
      {files.map((file, idx) => {
        const isSkill = isSkillFile(file);
        const displayName = getDisplayName(file);
        const imagePreview = getImagePreview(file);
        const isImage = isImageFile(file);

        return (
          <div
            key={file.id || `file_${idx}_${file.name}_${Date.now()}`}
            className={`message-file-item ${isSkill ? "skill-file-item" : ""}`}
            onClick={() => onFileClick?.(file)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "8px",
              background: isSkill ? "var(--accent-glow)" : "var(--bg-tertiary)",
              border: isSkill
                ? "1px solid var(--accent-color)"
                : "1px solid var(--border-color)",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              minWidth: "60px",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              if (!isSkill) {
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isSkill
                ? "var(--accent-glow)"
                : "var(--bg-tertiary)";
              if (!isSkill) {
                e.currentTarget.style.borderColor = "var(--border-color)";
              }
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isImage && imagePreview ? (
              <img
                src={imagePreview}
                alt={file.name}
                className="file-preview-img"
                style={{
                  width: "60px",
                  height: "60px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
                onError={(e) => {
                  console.error("Image failed to load:", file.name);
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : isSkill ? (
              <div
                className="file-icon-placeholder"
                style={{
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  background: "var(--accent-glow)",
                  border: "1px solid var(--accent-color)",
                  borderRadius: "4px",
                }}
              >
                <span style={{ fontSize: "28px" }}>{getSkillIcon()}</span>
              </div>
            ) : (
              <div
                className="file-icon-placeholder"
                style={{
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  background: "var(--bg-secondary)",
                  borderRadius: "4px",
                }}
              >
                {getFileIcon(file, 28)}
              </div>
            )}
            <div
              className="file-info"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span
                className="file-name"
                title={displayName}
                style={{
                  fontSize: "10px",
                  color: "var(--text-primary)",
                  maxWidth: "80px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName.length > 15
                  ? displayName.slice(0, 12) + "..."
                  : displayName}
              </span>
              <span
                className="file-size"
                style={{
                  fontSize: "9px",
                  color: "var(--text-tertiary)",
                }}
              >
                {formatFileSize(file.size)}
              </span>
              {isSkill && (
                <span
                  style={{
                    fontSize: "8px",
                    color: "var(--accent-color)",
                    fontWeight: 500,
                  }}
                >
                  SKILL
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
