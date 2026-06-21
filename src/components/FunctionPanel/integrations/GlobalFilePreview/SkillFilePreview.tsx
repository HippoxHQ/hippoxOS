import React, { useState, useEffect, useCallback } from "react";
import { filesCommands } from "../../../../command/files";
import { UploadFile } from "../../../../core/types";

interface SkillFilePreviewProps {
  file: UploadFile | null;
  onClose: () => void;
  onSendSkillMessage?: (message: string, files?: UploadFile[]) => void;
  t?: (key: string) => string;
}

const SkillFilePreview: React.FC<SkillFilePreviewProps> = ({
  file,
  onClose,
  onSendSkillMessage,
  t = (key: string) => key,
}) => {
  const [fileContent, setFileContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillName, setSkillName] = useState<string>("");
  const [skillDescription, setSkillDescription] = useState<string>("");
  const [skillVersion, setSkillVersion] = useState<string>("");
  const [skillAuthor, setSkillAuthor] = useState<string>("");
  const readSkillFile = useCallback(async (filePath: string) => {
    setIsLoading(true);
    try {
      const content = await filesCommands.readTextFile(filePath);
      setFileContent(content);
      parseSkillMetadata(content);
    } catch (err) {
      setError("Failed to read skill file");
    } finally {
      setIsLoading(false);
    }
  }, []);
  const parseSkillMetadata = (content: string) => {
    const lines = content.split("\n");
    let name = "";
    let description = "";
    let version = "";
    let author = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        name = trimmed.replace("# ", "").trim();
      } else if (trimmed.startsWith("## ")) {
        if (!description) {
          description = trimmed.replace("## ", "").trim();
        }
      } else if (trimmed.startsWith("> ")) {
        if (!description) {
          description = trimmed.replace("> ", "").trim();
        }
      } else if (trimmed.toLowerCase().includes("version")) {
        const match = trimmed.match(/version[:=]\s*([^\s,]+)/i);
        if (match) version = match[1];
      } else if (trimmed.toLowerCase().includes("author")) {
        const match = trimmed.match(/author[:=]\s*([^\s,]+)/i);
        if (match) author = match[1];
      }
    }
    if (!name && file?.name) {
      name = file.name.replace(/\.md$/i, "").replace(/_/g, " ");
    }
    setSkillName(name || file?.name || "Unknown Skill");
    setSkillDescription(description || "No description available");
    setSkillVersion(version || "1.0.0");
    setSkillAuthor(author || "Unknown");
  };
  useEffect(() => {
    if (file?.path) {
      setFileContent("");
      setError(null);
      readSkillFile(file.path);
    }
  }, [file, readSkillFile]);
  const handleUseSkill = () => {
    if (onSendSkillMessage && file) {
      const skillPrompt = `@skill ${file.path}`;
      onSendSkillMessage(skillPrompt, [file]);
      onClose();
    }
  };
  if (!file) return null;
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };
  const isSkillFile =
    file.name?.endsWith(".md") || file.name?.endsWith(".skill.md");
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
          <span>⚡</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 200,
            }}
          >
            {skillName}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {isSkillFile && onSendSkillMessage && (
            <button
              onClick={handleUseSkill}
              style={{
                background: "var(--accent-color)",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 6,
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Use Skill
            </button>
          )}
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
      </div>

      <div
        style={{
          padding: "8px 16px",
          background: "var(--bg-tertiary)",
          fontSize: 12,
          color: "var(--text-secondary)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <span>Version: {skillVersion}</span>
        <span>Author: {skillAuthor}</span>
        <span>Size: {formatFileSize(file.size)}</span>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 16,
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
            Loading skill...
          </div>
        )}
        {error && (
          <div style={{ color: "#ff6666", textAlign: "center", padding: 40 }}>
            {error}
          </div>
        )}
        {!isLoading && !error && (
          <>
            {skillDescription && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-secondary)",
                  borderRadius: 8,
                  marginBottom: 16,
                  borderLeft: "3px solid var(--accent-color)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  Description
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  {skillDescription}
                </div>
              </div>
            )}
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 8,
              }}
            >
              Skill Content
            </div>
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
              {fileContent || "Skill file is empty"}
            </pre>
          </>
        )}
      </div>
    </div>
  );
};

export default SkillFilePreview;
