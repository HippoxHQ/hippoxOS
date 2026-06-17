import React from "react";
import { getFileIcon } from "../../../common";
import { UploadFile } from "../../../core/types";

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
  return (
    <div className="message-files-grid" style={{ direction: "rtl" }}>
      {[...files].reverse().map((file, idx) => (
        <div
          key={file.id || `file_${idx}_${file.name}_${Date.now()}`}
          className="message-file-item"
          onClick={() => onFileClick?.(file)}
          style={{ direction: "ltr" }}
        >
          {file.type?.startsWith("image/") && file.preview ? (
            <img
              src={file.preview}
              alt={file.name}
              className="file-preview-img"
            />
          ) : (
            <div className="file-icon-placeholder">{getFileIcon(file, 28)}</div>
          )}
          <div className="file-info">
            <span className="file-name" title={file.name}>
              {file.name.length > 15
                ? file.name.slice(0, 12) + "..."
                : file.name}
            </span>
            <span className="file-size">{formatFileSize(file.size)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
