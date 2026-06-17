import React from "react";
import { formatFileSize } from "../utils";
import { getFileIcon } from "../../../../common";
import { UploadFile } from "../../../../core/types";

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
                filesScrollRefs.current.set(taskId, el);
                const checkScroll = () => {
                  const { scrollLeft, scrollWidth, clientWidth } = el;
                  const showLeft = scrollLeft > 0;
                  const showRight = scrollLeft + clientWidth < scrollWidth - 1;
                  setFilesScrollStates((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(taskId, { showLeft, showRight });
                    return newMap;
                  });
                };
                el.addEventListener("scroll", checkScroll);
                setTimeout(checkScroll, 100);
              } else {
                filesScrollRefs.current.delete(taskId);
              }
            }}
          >
            {files.map((file: UploadFile, idx: number) => (
              <div
                key={file.id || `task_file_${taskId}_${idx}_${file.name}`}
                className="task-file-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileClick?.(file);
                }}
              >
                {file.type?.startsWith("image/") && file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="task-file-preview-img"
                  />
                ) : (
                  <div className="task-file-icon">{getFileIcon(file, 18)}</div>
                )}
                <div className="task-file-info">
                  <span className="task-file-name" title={file.name}>
                    {file.name.length > 25
                      ? file.name.slice(0, 22) + "..."
                      : file.name}
                  </span>
                  <span className="task-file-size">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
            ))}
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
