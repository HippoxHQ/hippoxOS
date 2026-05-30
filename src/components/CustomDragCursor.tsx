import React, { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

interface CustomDragCursorProps {
  isDragging: boolean;
  t?: (key: string, params?: any) => string;
}

const CustomDragCursor: React.FC<CustomDragCursorProps> = ({
  isDragging,
  t,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [fileCount, setFileCount] = useState(0);
  const getText = (key: string, params?: any): string => {
    if (t) return t(key, params);
    const fallback: Record<string, string> = {
      "chat.fileUpload.files": "files",
    };
    let text = fallback[key] || key;
    if (params && params.count !== undefined) {
      text = text.replace("{{count}}", params.count);
    }
    return text;
  };
  useEffect(() => {
    if (!isDragging) return;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setPosition({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener("dragover", handleDragOver);
    return () => {
      document.removeEventListener("dragover", handleDragOver);
    };
  }, [isDragging]);
  useEffect(() => {
    let unlistenDragEnter: (() => void) | undefined;
    const setupListener = async () => {
      unlistenDragEnter = await listen<{ fileCount: number }>(
        "drag-enter",
        (event) => {
          console.log("Drag enter with file count:", event.payload.fileCount);
          setFileCount(event.payload.fileCount);
        },
      );
    };
    setupListener();
    return () => {
      if (unlistenDragEnter) unlistenDragEnter();
    };
  }, []);

  useEffect(() => {
    let unlistenDragLeave: (() => void) | undefined;
    const setupListener = async () => {
      unlistenDragLeave = await listen<void>("drag-leave", () => {
        setFileCount(0);
      });
    };
    setupListener();
    return () => {
      if (unlistenDragLeave) unlistenDragLeave();
    };
  }, []);

  if (!isDragging) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: position.x + 15,
        top: position.y + 15,
        zIndex: 10000,
        pointerEvents: "none",
        animation: "float 0.2s ease",
      }}
    >
      <style>
        {`
          @keyframes float {
            from {
              transform: scale(0.8);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--accent-color)",
          borderRadius: "20px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          fontSize: "12px",
          color: "var(--text-primary)",
          backdropFilter: "blur(8px)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 3H4V21H20V8H13V3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M13 3V8H18"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
        <span>
          {fileCount} {getText("chat.fileUpload.files", { count: fileCount })}
        </span>
      </div>
    </div>
  );
};

export default CustomDragCursor;
