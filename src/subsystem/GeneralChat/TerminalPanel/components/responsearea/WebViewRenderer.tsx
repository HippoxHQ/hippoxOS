import React, { useState, useRef, useEffect } from "react";
import { WebViewResource } from "../../../llm/types";
import { osCommands } from "../../../../../command/os";
interface WebViewRendererProps {
  data: WebViewResource[];
  t: (key: string) => string;
  isZh?: boolean;
}
/**
 * WebViewRenderer component for displaying web content in an iframe
 * - Allows vertical scrolling within the iframe
 * - Opens all links using system default browser via osCommands.openBrowser
 */
const WebViewRenderer: React.FC<WebViewRendererProps> = ({ data, t, isZh = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Calculate scale to fit width
  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      // Scale to fit typical 1200px webpage width
      const newScale = Math.min(1, containerWidth / 1200);
      setScale(newScale);
    };
    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, []);
  // No data state
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "12px",
        }}
      >
        {isZh ? "暂无网页内容" : "No web content available"}
      </div>
    );
  }
  const currentWebview = data[currentIndex];
  const sanitizeUrl = (url: string): string => {
    const lower = url.toLowerCase().trim();
    const dangerous = ["javascript:", "data:", "vbscript:", "file:"];
    for (const prefix of dangerous) {
      if (lower.startsWith(prefix)) {
        return "about:blank";
      }
    }
    return url;
  };
  const safeUrl = sanitizeUrl(currentWebview.url);
  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };
  const handleIframeError = () => {
    setIsLoading(false);
    setError(isZh ? "加载页面失败" : "Failed to load page");
  };
  // Navigate to next/previous webview
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % data.length);
    setIsLoading(true);
    setError(null);
  };
  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + data.length) % data.length);
    setIsLoading(true);
    setError(null);
  };
  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = safeUrl;
      setIsLoading(true);
      setError(null);
    }
  };
  // Open URL using system browser via osCommands
  const openInSystemBrowser = () => {
    if (safeUrl && safeUrl !== "about:blank") {
      osCommands.openBrowser(safeUrl);
    }
  };
  // Sandbox attributes - allow necessary permissions
  const sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation";
  return (
    <div
      ref={containerRef}
      className="terminal-webview"
      style={{
        margin: "8px 0",
        background: "var(--bg-tertiary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        position: "relative",
        contain: "layout style paint",
        isolation: "isolate",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minHeight: "32px",
          overflow: "hidden",
          flexShrink: 0,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: "13px", lineHeight: 1, flexShrink: 0 }}>🌐</span>
        <span
          style={{
            flex: 1,
            color: "var(--text-primary)",
            fontSize: "12px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {currentWebview.title || currentWebview.url}
        </span>
        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          {data.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  padding: "0 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  height: "20px",
                  lineHeight: "20px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
                title={isZh ? "上一个" : "Previous"}
              >
                ◀
              </button>
              <button
                onClick={goToNext}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  padding: "0 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  height: "20px",
                  lineHeight: "20px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
                title={isZh ? "下一个" : "Next"}
              >
                ▶
              </button>
            </>
          )}
          {/* Open in system browser button */}
          <button
            onClick={openInSystemBrowser}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "0 6px",
              borderRadius: "4px",
              fontSize: "11px",
              height: "20px",
              lineHeight: "20px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
            title={isZh ? "在系统浏览器打开" : "Open in system browser"}
          >
            ↗
          </button>
          <button
            onClick={reloadIframe}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "0 6px",
              borderRadius: "4px",
              fontSize: "11px",
              height: "20px",
              lineHeight: "20px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
            title={isZh ? "刷新" : "Refresh"}
          >
            ⟳
          </button>
        </div>
      </div>
      {/* Iframe container - allows vertical scroll */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          height: currentWebview.height || "400px",
          background: "var(--bg-primary)",
          // overflow: "auto",
          boxSizing: "border-box",
          // Allow vertical scroll, hide horizontal
          // overflowX: "hidden",
          // overflowY: "auto",
        }}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-tertiary)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "var(--text-tertiary)",
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "20px",
                  height: "20px",
                  border: "2px solid var(--border-color)",
                  borderTop: "2px solid var(--accent-color)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span>{isZh ? "加载中..." : "Loading..."}</span>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          </div>
        )}
        {/* Error overlay */}
        {error && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-tertiary)",
              color: "#ef4444",
              fontSize: "13px",
              zIndex: 10,
              gap: "8px",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: "28px" }}>⚠️</span>
            <span>{error}</span>
            <button
              onClick={reloadIframe}
              style={{
                padding: "4px 16px",
                background: "var(--accent-color)",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                pointerEvents: "auto",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              {isZh ? "重试" : "Retry"}
            </button>
          </div>
        )}
        {/* Iframe with scale to fit width */}
        <div
          style={{
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            ref={iframeRef}
            key={`iframe-${currentIndex}`}
            src={safeUrl}
            title={currentWebview.title || "WebView"}
            sandbox={sandbox}
            allow={currentWebview.allowFullscreen ? "fullscreen" : ""}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: "#ffffff",
              display: "block",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
      {/* Footer with URL info */}
      <div
        style={{
          padding: "4px 12px",
          fontSize: "10px",
          color: "var(--text-tertiary)",
          borderTop: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          maxWidth: "100%",
          width: "100%",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{safeUrl}</span>
        {data.length > 1 && (
          <span style={{ opacity: 0.5, flexShrink: 0 }}>
            ({currentIndex + 1}/{data.length})
          </span>
        )}
        <span
          style={{
            fontSize: "8px",
            color: "var(--text-tertiary)",
            opacity: 0.5,
            flexShrink: 0,
          }}
        >
          {isZh ? `缩放 ${Math.round(scale * 100)}%` : `Zoom ${Math.round(scale * 100)}%`}
        </span>
      </div>
    </div>
  );
};
export default WebViewRenderer;
