import React, { useState, useRef } from "react";
import { WebViewResource } from "../../../llm/types";
interface WebViewRendererProps {
  data: WebViewResource[];
  t: (key: string) => string;
  isZh?: boolean;
}
const WebViewRenderer: React.FC<WebViewRendererProps> = ({ data, t, isZh = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
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
  // Sanitize URL - prevent dangerous protocols
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
  // Handle iframe load complete
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };
  // Handle iframe load error
  const handleIframeError = () => {
    setIsLoading(false);
    setError(isZh ? "加载页面失败" : "Failed to load page");
  };
  // Open current URL in new tab
  const openInNewTab = () => {
    if (safeUrl && safeUrl !== "about:blank") {
      window.open(safeUrl, "_blank");
    }
  };
  // Navigate to next webview
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % data.length);
    setIsLoading(true);
    setError(null);
  };
  // Navigate to previous webview
  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + data.length) % data.length);
    setIsLoading(true);
    setError(null);
  };
  // Reload iframe
  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = safeUrl;
      setIsLoading(true);
      setError(null);
    }
  };
  // Sandbox attributes - allow necessary permissions
  const sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation";
  return (
    <div
      className="terminal-webview"
      style={{
        margin: "8px 0",
        background: "var(--bg-tertiary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        width: "100%",
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
        }}
      >
        <span style={{ fontSize: "13px", lineHeight: 1 }}>🌐</span>
        <span
          style={{
            flex: 1,
            color: "var(--text-primary)",
            fontSize: "12px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentWebview.title || currentWebview.url}
        </span>
        <div style={{ display: "flex", gap: "2px" }}>
          {/* Navigation buttons for multiple webviews */}
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
          {/* Open in new tab button */}
          <button
            onClick={openInNewTab}
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
            title={isZh ? "在新窗口打开" : "Open in new tab"}
          >
            ↗
          </button>
          {/* Reload button */}
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
      {/* Iframe container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: currentWebview.height || "400px",
          background: "var(--bg-primary)",
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
        {/* Iframe */}
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
            width: currentWebview.width || "100%",
            height: "100%",
            border: "none",
            background: "#ffffff",
          }}
        />
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
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{safeUrl}</span>
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
          {isZh ? "点击链接在内部打开" : "Links open in-frame"}
        </span>
      </div>
    </div>
  );
};
export default WebViewRenderer;
