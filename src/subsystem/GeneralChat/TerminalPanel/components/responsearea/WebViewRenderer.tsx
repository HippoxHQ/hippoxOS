import React, { useState, useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
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
  // Sanitize URL - prevent javascript: and other dangerous protocols
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
  // Generate a unique ID for this iframe to handle link interception
  const iframeId = `webview-iframe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  // Handle iframe load - inject script to intercept link clicks
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    // Attempt to intercept link clicks inside the iframe
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        // Inject a script to intercept all link clicks and force them to open in the iframe
        try {
          const script = `
            (function() {
              // Intercept all anchor clicks
              document.addEventListener('click', function(e) {
                var target = e.target;
                // Find the nearest anchor element
                while (target && target.tagName !== 'A') {
                  target = target.parentElement;
                }
                if (target && target.tagName === 'A') {
                  var href = target.getAttribute('href');
                  if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    // Remove target="_blank" or target="_new" to force same frame
                    target.removeAttribute('target');
                    // Prevent default and navigate in the same frame
                    e.preventDefault();
                    window.location.href = href;
                  }
                }
              }, true);
            })();
          `;
          // Try to inject via document write (works for same-origin)
          // For cross-origin, this will fail silently
          const scriptElement = iframe.contentWindow.document.createElement("script");
          scriptElement.textContent = script;
          iframe.contentWindow.document.head.appendChild(scriptElement);
        } catch (e) {
          // Cross-origin restrictions - silently fail
          console.debug("[WebView] Cannot inject script due to cross-origin");
        }
      }
    } catch (e) {
      // Cross-origin restrictions
      console.debug("[WebView] Cannot access iframe content due to cross-origin");
    }
  };
  const handleIframeError = () => {
    setIsLoading(false);
    setError(isZh ? "加载页面失败" : "Failed to load page");
  };
  const openInNewTab = () => {
    if (safeUrl && safeUrl !== "about:blank") {
      window.open(safeUrl, "_blank");
    }
  };
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
  // Reload iframe
  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = safeUrl;
      setIsLoading(true);
      setError(null);
    }
  };
  // Use srcdoc with a meta refresh for pages that need to be forced inside iframe
  const getSrcDoc = (url: string): string | undefined => {
    // For some sites, we can use a simple HTML page with a redirect
    // This helps with sites that try to break out of iframes
    if (url.startsWith("http")) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${url}">
  <base target="_self">
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      font-family: sans-serif;
      color: #666;
      background: #f5f5f5;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      display: inline-block;
      width: 30px;
      height: 30px;
      border: 3px solid #e0e0e0;
      border-top: 3px solid #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <div>${isZh ? "加载中..." : "Loading..."}</div>
  </div>
</body>
</html>`;
    }
    return undefined;
  };
  // Determine if we should use srcdoc for this URL
  const useSrcDoc = safeUrl.startsWith("http") && !safeUrl.includes("github.com");
  // Sandbox attributes - allow necessary permissions
  // allow-top-navigation-by-user-activation allows user-initiated navigation
  // allow-same-origin for script access
  // allow-scripts for JavaScript
  // allow-popups for popups (but we try to prevent them)
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
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: currentWebview.height || "400px",
          background: "var(--bg-primary)",
        }}
      >
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
