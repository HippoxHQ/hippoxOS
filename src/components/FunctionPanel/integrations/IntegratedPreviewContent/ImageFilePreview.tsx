import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { filesCommands } from "../../../../command/files";
import { UploadFile } from "../../../../core/types";

interface ImageFilePreviewProps {
  file: UploadFile | null;
  onClose: () => void;
  t?: (key: string, params?: any) => string;
}

const ImageFilePreview: React.FC<ImageFilePreviewProps> = memo(
  ({ file, onClose, t = (key: string) => key }) => {
    const [imageBase64, setImageBase64] = useState<string>("");
    const [fileSize, setFileSize] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState<number>(1);
    const [position, setPosition] = useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });
    const [positionStart, setPositionStart] = useState<{
      x: number;
      y: number;
    }>({
      x: 0,
      y: 0,
    });
    const [rotation, setRotation] = useState<number>(0);
    const [fitMode, setFitMode] = useState<"contain" | "cover" | "fill">(
      "contain",
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const scaleRef = useRef(1);
    const positionRef = useRef({ x: 0, y: 0 });
    const rotationRef = useRef(0);
    const isDraggingRef = useRef(false);
    const formatFileSize = useCallback((bytes: number): string => {
      if (bytes === 0) return "Unknown size";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }, []);
    useEffect(() => {
      scaleRef.current = scale;
    }, [scale]);
    useEffect(() => {
      positionRef.current = position;
    }, [position]);
    useEffect(() => {
      rotationRef.current = rotation;
    }, [rotation]);
    useEffect(() => {
      isDraggingRef.current = isDragging;
    }, [isDragging]);

    const readImageFile = useCallback(
      async (filePath: string) => {
        setIsLoading(true);
        setError(null);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
        scaleRef.current = 1;
        positionRef.current = { x: 0, y: 0 };
        rotationRef.current = 0;

        try {
          const result = await filesCommands.readFileBase64AndSize(filePath);
          setImageBase64(result.base64);
          setFileSize(result.size);
        } catch (err) {
          setError(t("imagePreview.loadFailed") || "Failed to load image");
        } finally {
          setIsLoading(false);
        }
      },
      [t],
    );
    useEffect(() => {
      if (file?.path) {
        readImageFile(file.path);
      }
    }, [file?.path]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleZoomIn = useCallback(() => {
      setScale((prev) => Math.min(prev + 0.25, 5));
    }, []);
    const handleZoomOut = useCallback(() => {
      setScale((prev) => Math.max(prev - 0.25, 0.25));
    }, []);
    const handleReset = useCallback(() => {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setFitMode("contain");
      scaleRef.current = 1;
      positionRef.current = { x: 0, y: 0 };
      rotationRef.current = 0;
    }, []);
    const handleRotate = useCallback(() => {
      setRotation((prev) => (prev + 90) % 360);
    }, []);
    const handleFitToScreen = useCallback(() => {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setFitMode((prev) => {
        if (prev === "contain") return "cover";
        if (prev === "cover") return "fill";
        return "contain";
      });
      scaleRef.current = 1;
      positionRef.current = { x: 0, y: 0 };
    }, []);

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (scale > 1 || e.button === 0) {
          setIsDragging(true);
          isDraggingRef.current = true;
          setDragStart({ x: e.clientX, y: e.clientY });
          setPositionStart({ ...position });
          e.preventDefault();
        }
      },
      [scale, position],
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (isDragging) {
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          setPosition({
            x: positionStart.x + dx,
            y: positionStart.y + dy,
          });
        }
      },
      [isDragging, dragStart, positionStart],
    );

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
      isDraggingRef.current = false;
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDraggingRef.current) {
        return;
      }

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => {
        const newScale = Math.min(Math.max(prev + delta, 0.25), 5);
        return newScale;
      });
    }, []);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        switch (e.key) {
          case "+":
          case "=":
            e.preventDefault();
            handleZoomIn();
            break;
          case "-":
            e.preventDefault();
            handleZoomOut();
            break;
          case "0":
            e.preventDefault();
            handleReset();
            break;
          case "r":
          case "R":
            e.preventDefault();
            handleRotate();
            break;
          case "f":
          case "F":
            e.preventDefault();
            handleFitToScreen();
            break;
          case "Escape":
            e.preventDefault();
            onClose();
            break;
        }
      },
      [
        handleZoomIn,
        handleZoomOut,
        handleReset,
        handleRotate,
        handleFitToScreen,
        onClose,
      ],
    );

    useEffect(() => {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleKeyDown]);

    const imageTransformStyle = React.useMemo(
      () =>
        ({
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
          willChange: "transform",
        }) as React.CSSProperties,
      [position.x, position.y, scale, rotation, isDragging],
    );
    if (!file) return null;
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          position: "relative",
          touchAction: "none",
          overflow: "hidden",
        }}
        onWheel={handleWheel}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            flexShrink: 0,
            zIndex: 1,
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
              overflow: "hidden",
            }}
          >
            <span>🖼️</span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 150,
              }}
            >
              {file.name}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontWeight: 400,
              }}
            >
              {formatFileSize(fileSize)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={handleZoomOut}
              style={iconButtonStyle}
              title={t("imagePreview.zoomOut") || "Zoom Out (-)"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M8 11h6" />
              </svg>
            </button>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-primary)",
                minWidth: 40,
                textAlign: "center",
              }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              style={iconButtonStyle}
              title={t("imagePreview.zoomIn") || "Zoom In (+)"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            </button>
            <div
              style={{
                width: 1,
                height: 24,
                background: "var(--border-color)",
                margin: "0 4px",
              }}
            />
            <button
              onClick={handleRotate}
              style={iconButtonStyle}
              title={t("imagePreview.rotate") || "Rotate (R)"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12v4a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h7" />
                <path d="M15 6h6v6" />
              </svg>
            </button>
            <button
              onClick={handleFitToScreen}
              style={iconButtonStyle}
              title={t("imagePreview.fitToScreen") || "Fit to Screen (F)"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 3H5a2 2 0 00-2 2v3" />
                <path d="M16 3h3a2 2 0 012 2v3" />
                <path d="M21 16v3a2 2 0 01-2 2h-3" />
                <path d="M8 21H5a2 2 0 01-2-2v-3" />
              </svg>
            </button>
            <button
              onClick={handleReset}
              style={iconButtonStyle}
              title={t("imagePreview.reset") || "Reset (0)"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.25 2.25L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>
        <div
          style={{
            padding: "4px 16px",
            background: "var(--bg-tertiary)",
            fontSize: 11,
            color: "var(--text-secondary)",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <span>{t("imagePreview.tooltipZoom") || "🖱️ Scroll: Zoom"}</span>
          <span>{t("imagePreview.tooltipPan") || "↕ Drag: Pan"}</span>
          <span>{t("imagePreview.tooltipZoomKeys") || "⌨️ +/-: Zoom"}</span>
          <span>{t("imagePreview.tooltipReset") || "⌨️ 0: Reset"}</span>
          <span>{t("imagePreview.tooltipRotate") || "⌨️ R: Rotate"}</span>
          <span>{t("imagePreview.tooltipFit") || "⌨️ F: Fit"}</span>
        </div>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            background: "var(--bg-primary)",
            cursor: scale > 1 ? "grab" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isLoading && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-primary)",
                padding: 40,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div>{t("imagePreview.loading") || "Loading..."}</div>
            </div>
          )}
          {error && (
            <div style={{ color: "#ff6666", textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
              <div>{error}</div>
            </div>
          )}
          {!isLoading && !error && imageBase64 && (
            <img
              ref={imageRef}
              src={imageBase64}
              alt={file.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: fitMode,
                ...imageTransformStyle,
                cursor: isDragging
                  ? "grabbing"
                  : scale > 1
                    ? "grab"
                    : "default",
                userSelect: "none",
                WebkitUserSelect: "none",
                pointerEvents: "auto",
                flexShrink: 0,
              }}
              draggable={false}
            />
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prevFileId = prevProps.file?.id || prevProps.file?.path || "";
    const nextFileId = nextProps.file?.id || nextProps.file?.path || "";
    return prevFileId === nextFileId;
  },
);

const iconButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
};

ImageFilePreview.displayName = "ImageFilePreview";

export default ImageFilePreview;
