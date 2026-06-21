import React, { useState, useEffect, useRef } from "react";
import { formatFileSize } from "../utils";
import { getFileIcon } from "../../../../common";
import { UploadFile } from "../../../../core/types";
import { filesCommands } from "../../../../command/files";

interface TaskFilesProps {
  files: UploadFile[];
  taskId: string;
  showLeft: boolean;
  showRight: boolean;
  onScrollLeft: (taskId: string) => void;
  onScrollRight: (taskId: string) => void;
  onFileClick?: (file: UploadFile) => void;
  filesScrollRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  setFilesScrollStates: React.Dispatch<
    React.SetStateAction<Map<string, { showLeft: boolean; showRight: boolean }>>
  >;
}

export const TaskFiles: React.FC<TaskFilesProps> = ({
  files,
  taskId,
  showLeft,
  showRight,
  onScrollLeft,
  onScrollRight,
  onFileClick,
  filesScrollRefs,
  setFilesScrollStates,
}) => {
  const [skillNames, setSkillNames] = useState<Map<string, string>>(new Map());
  const [imagePreviews, setImagePreviews] = useState<Map<string, string>>(
    new Map(),
  );
  const isMountedRef = useRef(true);
  const scrollCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    return () => {
      if (scrollCheckTimeoutRef.current) {
        clearTimeout(scrollCheckTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="task-files-scroll-container">
      <div className="task-files-scroll-wrapper">
        <div className="task-files-list-wrapper">
          {showLeft && (
            <button
              className="task-files-scroll-btn task-files-scroll-left"
              onClick={() => onScrollLeft(taskId)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <div
            className="task-files-scroll"
            ref={(el) => {
              if (el) {
                const existingRef = filesScrollRefs.current.get(taskId);
                if (existingRef !== el) {
                  filesScrollRefs.current.set(taskId, el);
                  requestAnimationFrame(() => {
                    if (scrollCheckTimeoutRef.current) {
                      clearTimeout(scrollCheckTimeoutRef.current);
                    }
                    scrollCheckTimeoutRef.current = setTimeout(() => {
                      const { scrollLeft, scrollWidth, clientWidth } = el;
                      const showLeft = scrollLeft > 0;
                      const showRight =
                        scrollLeft + clientWidth < scrollWidth - 1;
                      setFilesScrollStates((prev) => {
                        const currentState = prev.get(taskId);
                        if (
                          currentState &&
                          currentState.showLeft === showLeft &&
                          currentState.showRight === showRight
                        ) {
                          return prev;
                        }
                        const newMap = new Map(prev);
                        newMap.set(taskId, { showLeft, showRight });
                        return newMap;
                      });
                      scrollCheckTimeoutRef.current = null;
                    }, 100);
                  });
                }

                if (!(el as any).__scrollListenerAttached) {
                  const handleScroll = () => {
                    const { scrollLeft, scrollWidth, clientWidth } = el;
                    const showLeft = scrollLeft > 0;
                    const showRight =
                      scrollLeft + clientWidth < scrollWidth - 1;
                    setFilesScrollStates((prev) => {
                      const currentState = prev.get(taskId);
                      if (
                        currentState &&
                        currentState.showLeft === showLeft &&
                        currentState.showRight === showRight
                      ) {
                        return prev;
                      }
                      const newMap = new Map(prev);
                      newMap.set(taskId, { showLeft, showRight });
                      return newMap;
                    });
                  };
                  el.addEventListener("scroll", handleScroll);
                  (el as any).__scrollListenerAttached = true;
                  (el as any).__scrollHandler = handleScroll;
                }
              } else {
                const existingEl = filesScrollRefs.current.get(taskId);
                if (existingEl && (existingEl as any).__scrollHandler) {
                  existingEl.removeEventListener(
                    "scroll",
                    (existingEl as any).__scrollHandler,
                  );
                }
                filesScrollRefs.current.delete(taskId);
              }
            }}
          >
            {files.map((file: UploadFile, idx: number) => {
              const isSkill = isSkillFile(file);
              const displayName = getDisplayName(file);
              const imagePreview = getImagePreview(file);
              const isImage = isImageFile(file);
              return (
                <div
                  key={file.id || `task_file_${taskId}_${idx}_${file.name}`}
                  className={`task-file-chip ${isSkill ? "skill-file-chip" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileClick?.(file);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 10px",
                    minWidth: "140px",
                    maxWidth: "180px",
                    background: isSkill
                      ? "var(--accent-glow)"
                      : "var(--bg-tertiary)",
                    border: isSkill
                      ? "1px solid var(--accent-color)"
                      : "1px solid var(--border-color)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
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
                      className="task-file-preview-img"
                      style={{
                        width: "32px",
                        height: "32px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : isSkill ? (
                    <div
                      className="task-file-icon"
                      style={{
                        background: "var(--accent-glow)",
                        border: "1px solid var(--accent-color)",
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>{getSkillIcon()}</span>
                    </div>
                  ) : (
                    <div className="task-file-icon">
                      {getFileIcon(file, 18)}
                    </div>
                  )}
                  <div className="task-file-info">
                    <span className="task-file-name" title={displayName}>
                      {displayName.length > 25
                        ? displayName.slice(0, 22) + "..."
                        : displayName}
                    </span>
                    <span className="task-file-size">
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
          {showRight && (
            <button
              className="task-files-scroll-btn task-files-scroll-right"
              onClick={() => onScrollRight(taskId)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
