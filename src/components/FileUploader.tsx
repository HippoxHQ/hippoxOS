import React, { useState, useRef, useEffect } from "react";

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  status: "uploading" | "success" | "error";
  progress?: number;
  path?: string;
}

interface FileUploaderProps {
  onFilesAdd: (files: UploadFile[]) => void;
  onFileRemove: (fileId: string) => void;
  files: UploadFile[];
  disabled?: boolean;
  onDragOverInput?: (isDragging: boolean) => void;
  t?: (key: string, params?: any) => string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesAdd,
  onFileRemove,
  files,
  disabled = false,
  onDragOverInput,
  t,
}) => {
  const [isInputDragging, setIsInputDragging] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const fileListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getText = (key: string): string => {
    if (t) return t(key);
    const fallback: Record<string, string> = {
      "chat.fileUpload.remove": "Remove",
      "chat.fileUpload.scrollLeft": "Scroll left",
      "chat.fileUpload.scrollRight": "Scroll right",
      "chat.fileUpload.file": "File",
      "chat.fileUpload.image": "Image",
      "chat.fileUpload.video": "Video",
      "chat.fileUpload.text": "Text",
      "chat.fileUpload.code": "Code",
      "chat.fileUpload.pdf": "PDF",
      "chat.fileUpload.document": "Document",
      "chat.fileUpload.spreadsheet": "Spreadsheet",
      "chat.fileUpload.presentation": "Presentation",
      "chat.fileUpload.archive": "Archive",
    };
    return fallback[key] || key;
  };

  useEffect(() => {
    const handleFilesDropped = (event: CustomEvent) => {
      const { filePaths } = event.detail;
      if (filePaths && filePaths.length > 0) {
        processFilePaths(filePaths);
      }
    };

    window.addEventListener(
      "files-dropped",
      handleFilesDropped as EventListener,
    );

    return () => {
      window.removeEventListener(
        "files-dropped",
        handleFilesDropped as EventListener,
      );
    };
  }, []);

  const checkScrollPosition = () => {
    if (fileListRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = fileListRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      checkScrollPosition();
    }, 100);
  }, [files]);

  useEffect(() => {
    const currentRef = fileListRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", checkScrollPosition);
      window.addEventListener("resize", checkScrollPosition);
      return () => {
        currentRef.removeEventListener("scroll", checkScrollPosition);
        window.removeEventListener("resize", checkScrollPosition);
      };
    }
  }, [files]);

  const scrollLeft = () => {
    if (fileListRef.current) {
      fileListRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (fileListRef.current) {
      fileListRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const processFilePaths = (filePaths: string[]) => {
    const newFiles: UploadFile[] = filePaths.map((path, index) => {
      const fileName = path.split(/[\\/]/).pop() || "unknown";
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      let fileType = "application/octet-stream";
      if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) {
        fileType = "image/" + ext;
      } else if (["mp4", "webm", "mov", "avi"].includes(ext)) {
        fileType = "video/" + ext;
      } else if (
        [
          "txt",
          "md",
          "json",
          "js",
          "ts",
          "html",
          "css",
          "xml",
          "py",
          "rs",
        ].includes(ext)
      ) {
        fileType = "text/plain";
      } else if (["pdf"].includes(ext)) {
        fileType = "application/pdf";
      } else if (["doc", "docx"].includes(ext)) {
        fileType = "application/msword";
      } else if (["xls", "xlsx"].includes(ext)) {
        fileType = "application/vnd.ms-excel";
      } else if (["ppt", "pptx"].includes(ext)) {
        fileType = "application/vnd.ms-powerpoint";
      } else if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
        fileType = "application/zip";
      }
      let preview: string | undefined;
      if (fileType.startsWith("image/")) {
        preview = URL.createObjectURL(new File([], fileName));
      }
      return {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${index}_${fileName}`,
        file: new File([], fileName),
        name: fileName,
        size: 0,
        type: fileType,
        status: "success" as const,
        path: path,
        preview,
      };
    });
    onFilesAdd(newFiles);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          <path
            d="M4 16L8 12L12 16L16 12L20 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    } else if (fileType.startsWith("video/")) {
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M10 9L15 12L10 15V9Z" fill="currentColor" />
        </svg>
      );
    } else if (fileType === "application/pdf") {
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 4H14L18 8V20H6V4Z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M14 4V8H18"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <text x="8" y="17" fontSize="8" fill="currentColor">
            PDF
          </text>
        </svg>
      );
    } else if (
      fileType === "text/plain" ||
      fileType.includes("javascript") ||
      fileType.includes("json")
    ) {
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 4H14L18 8V20H6V4Z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M14 4V8H18"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M9 13H15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9 17H13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    return (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 4H14L18 8V20H6V4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M14 4V8H18"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileDisplayType = (fileType: string): string => {
    if (fileType.startsWith("image/")) return getText("chat.fileUpload.image");
    if (fileType.startsWith("video/")) return getText("chat.fileUpload.video");
    if (fileType === "application/pdf") return getText("chat.fileUpload.pdf");
    if (fileType === "text/plain") return getText("chat.fileUpload.text");
    if (fileType.includes("javascript") || fileType.includes("json"))
      return getText("chat.fileUpload.code");
    if (
      fileType === "application/msword" ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
      return getText("chat.fileUpload.document");
    if (
      fileType === "application/vnd.ms-excel" ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
      return getText("chat.fileUpload.spreadsheet");
    if (
      fileType === "application/vnd.ms-powerpoint" ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
      return getText("chat.fileUpload.presentation");
    if (fileType === "application/zip" || fileType.includes("compressed"))
      return getText("chat.fileUpload.archive");
    return getText("chat.fileUpload.file");
  };
  const processFiles = (fileList: FileList | File[]) => {
    const newFiles: UploadFile[] = Array.from(fileList).map((file, index) => {
      let preview: string | undefined;
      if (file.type.startsWith("image/")) {
        preview = URL.createObjectURL(file);
      }
      return {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${file.name}_${index}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview,
        status: "success",
      };
    });
    onFilesAdd(newFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    if (!disabled && !isInputDragging) {
      setIsInputDragging(true);
      onDragOverInput?.(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInputDragging(false);
    onDragOverInput?.(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInputDragging(false);
    onDragOverInput?.(false);
    if (disabled) return;
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview && file.preview.startsWith("blob:")) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  return (
    <div className="file-uploader-component">
      <style>{`
        .file-uploader-component {
          position: relative;
          width: 100%;
        }

        .file-list-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary);
          gap: 4px;
          padding: 0 4px;
          border-radius: 12px;
        }

        .scroll-btn {
          flex-shrink: 0;
          width: 28px;
          height: 60px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          opacity: 0.8;
        }

        .scroll-btn:hover {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
          opacity: 1;
        }

        .file-list {
          flex: 1;
          display: flex;
          flex-wrap: nowrap;
          gap: 12px;
          padding: 10px 0;
          overflow-x: auto;
          scrollbar-width: none;
          scroll-behavior: smooth;
        }

        .file-list::-webkit-scrollbar {
          display: none;
        }

        .file-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 245px;
          height: 60px;
          padding: 8px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: default;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .file-item:hover {
          background: var(--hover-bg);
          border-color: var(--accent-color);
          transform: translateY(-1px);
        }

        .file-preview {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          overflow: hidden;
          background: var(--bg-tertiary);
          flex-shrink: 0;
        }

        .file-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .file-icon {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .file-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .file-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .file-type {
          color: var(--text-secondary);
        }

        .file-size {
          color: var(--text-tertiary);
        }

        .file-separator {
          color: var(--border-color);
        }

        .file-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 1;
        }

        .file-item:hover .file-remove {
          opacity: 1;
        }

        .file-remove:hover {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }
      `}</style>

      {files.length > 0 && (
        <div className="file-list-wrapper">
          {showLeftArrow && (
            <button
              type="button"
              className="scroll-btn"
              onClick={(e) => {
                e.stopPropagation();
                scrollLeft();
              }}
              title={getText("chat.fileUpload.scrollLeft")}
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
          <div className="file-list" ref={fileListRef}>
            {files.map((file) => (
              <div
                key={file.id}
                className="file-item"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="file-preview">
                  {file.preview && file.preview.startsWith("blob:") ? (
                    <img src={file.preview} alt={file.name} />
                  ) : file.preview ? (
                    <img src={file.preview} alt={file.name} />
                  ) : (
                    <div className="file-icon">{getFileIcon(file.type)}</div>
                  )}
                </div>
                <div className="file-info">
                  <div className="file-name" title={file.name}>
                    {file.name.length > 20
                      ? file.name.slice(0, 18) + "..."
                      : file.name}
                  </div>
                  <div className="file-meta">
                    <span className="file-type">
                      {getFileDisplayType(file.type)}
                    </span>
                    <span className="file-separator">•</span>
                    <span className="file-size">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove(file.id);
                  }}
                  title={getText("chat.fileUpload.remove")}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {showRightArrow && (
            <button
              type="button"
              className="scroll-btn"
              onClick={(e) => {
                e.stopPropagation();
                scrollRight();
              }}
              title={getText("chat.fileUpload.scrollRight")}
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
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default FileUploader;
