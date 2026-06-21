import React, { useState, useRef, useEffect } from "react";
import ImageFilePreview from "./ImageFilePreview";
import SkillFilePreview from "./SkillFilePreview";
import TextFilePreview from "./TextFilePreview";
import { UploadFile } from "../../../core/types";

interface GlobalFilePreviewProps {
  file: UploadFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSendSkillMessage?: (message: string, files?: UploadFile[]) => void;
  t: (key: string, params?: any) => string;
}

const GlobalFilePreview: React.FC<GlobalFilePreviewProps> = ({
  file,
  isOpen,
  onClose,
  onSendSkillMessage,
  t,
}) => {
  const [width, setWidth] = useState<number>(480);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  useEffect(() => {
    const savedWidth = localStorage.getItem("hippox-global-preview-width");
    if (savedWidth) {
      setWidth(parseFloat(savedWidth));
    }
  }, []);
  const saveWidth = (w: number) => {
    localStorage.setItem("hippox-global-preview-width", w.toString());
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(
        800,
        Math.max(320, startWidthRef.current + delta),
      );
      if (newWidth !== width) {
        setWidth(newWidth);
        saveWidth(newWidth);
      }
    }
  };
  const handleMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [width]);
  if (!isOpen || !file) return null;
  const isSkillFile =
    file.name?.endsWith(".md") || file.name?.endsWith(".skill.md");
  const isImageFile = file.type?.startsWith("image/");
  const renderContent = () => {
    if (isSkillFile) {
      return (
        <SkillFilePreview
          key={file.id || file.path}
          file={file}
          onClose={onClose}
          onSendSkillMessage={onSendSkillMessage}
          t={t}
        />
      );
    }
    if (isImageFile) {
      return (
        <ImageFilePreview
          key={file.id || file.path}
          file={file}
          onClose={onClose}
          t={t}
        />
      );
    }
    return (
      <TextFilePreview
        key={file.id || file.path}
        file={file}
        onClose={onClose}
        t={t}
      />
    );
  };
  return (
    <div
      ref={containerRef}
      style={{
        width: width,
        flexShrink: 0,
        overflow: "hidden",
        background: "var(--bg-primary)",
        borderLeft: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          width: "4px",
          height: "100%",
          position: "absolute",
          left: "-2px",
          top: 0,
          cursor: "col-resize",
          zIndex: 10,
          background: "transparent",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--border-color)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        onMouseDown={handleMouseDown}
      />
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default GlobalFilePreview;
